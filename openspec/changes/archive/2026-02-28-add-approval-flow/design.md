## Context

High-risk tools currently throw a placeholder error: "This action requires approval which is not yet implemented." The spec defines an approval flow where the user approves or rejects via Telegram inline keyboard buttons. The agent loop runs inside a Cloudflare Workflow, and tool execution happens synchronously within Vercel AI SDK's `generateText`. We cannot pause `generateText` mid-execution to wait for user input, so the approval flow must be asynchronous.

## Goals / Non-Goals

**Goals:**

- Implement the approval flow for high-risk tool invocations
- Persist pending approvals in D1 with 10-minute expiry
- Send approval requests to Telegram with inline keyboard (Approve/Reject)
- Handle `callback_query` updates to approve or reject
- Execute approved operations and send results directly to Telegram
- Auto-expire stale approvals (lazy expiry)

**Non-Goals:**

- Batching multiple approvals into one message
- Approval delegation (only the original user can approve)
- Audit logging of approval actions (separate change)
- Approval for medium-risk tools (they execute immediately per spec)

## Decisions

### 1. Asynchronous approval (not blocking the LLM call)

When a high-risk tool is invoked, the gated execute function saves the pending approval to D1, sends an inline keyboard message to Telegram, and returns a message to the LLM: "Approval requested for [tool]. Check Telegram for the approval button." The LLM naturally informs the user.

When the user clicks Approve, a `callback_query` hits the webhook, the tool executes, and the result is sent to Telegram. The result is **not** routed back through the LLM — it's sent directly as a Telegram message.

**Why:** Cloudflare Workflows + `generateText` don't support pausing mid-tool-execution to wait for external events. An async flow is simpler, Cloudflare-native, and provides good UX for a messaging app.

**Alternative considered:** Workflow sleep + polling D1 for approval status. Rejected because it wastes step executions and adds complexity for no UX benefit in a chat context.

### 2. D1 table for pending approvals

```sql
CREATE TABLE pending_approvals (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  thread_id INTEGER,
  tool_name TEXT NOT NULL,
  tool_input TEXT NOT NULL,  -- JSON-serialized
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | expired
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

Use nanoid for the `id` (same pattern as messages table). `tool_input` is JSON-stringified so we can reconstruct the call on approval. `expires_at` is `created_at + 10 minutes`.

**Why:** D1 is already used for messages. No new bindings needed. The schema is minimal — just enough to reconstruct and execute the tool call.

### 3. Callback data encoding

Telegram `callback_data` is limited to 64 bytes. Encode as `approve:<id>` or `reject:<id>` where `id` is a nanoid (21 chars). This fits well within the limit.

### 4. Approval handler as injected callback

Instead of the registry knowing about D1 and Telegram, the workflow injects an `onHighRisk` callback into `toAISDKTools()`:

```ts
const sdkTools = registry.toAISDKTools({
  onHighRisk: async (toolName, input) => {
    // Save to D1, send Telegram inline keyboard
    return "Approval requested for ...";
  },
});
```

**Why:** Keeps the registry framework-agnostic. The workflow has access to env bindings (D1, bot token, chatId) and injects the behavior. The registry just calls the callback for high-risk tools instead of throwing.

### 5. Lazy expiry (no cron)

Expiry is checked when a callback arrives. If the approval has passed `expires_at`, it's marked as expired and the callback responds with "This approval has expired." No separate cron job or Durable Object alarm.

**Why:** Single-user system with low approval volume. A dedicated cron for expiry cleanup is over-engineering. Lazy expiry is simpler and sufficient.

### 6. Extend Telegram adapter for inline keyboards and callback queries

Add two methods to `TelegramAdapter`:
- `sendMessageWithInlineKeyboard(chatId, text, buttons, threadId?)` — sends a message with inline keyboard
- `answerCallbackQuery(callbackQueryId, text?)` — acknowledges a callback query

Add a `parseCallbackQuery` method to extract callback data from Telegram updates.

### 7. Callback query webhook handling

Extend the existing `POST /telegram/webhook` endpoint to handle `callback_query` updates in addition to regular messages. The update schema already supports both — we just need to check for `callback_query` after checking for `message`.

## Risks / Trade-offs

- **[Result not through LLM]** Approved tool results are sent directly to Telegram, not through the LLM. The LLM doesn't get to format or contextualize the result. → Acceptable for Phase 1. The result message can include a clear prefix like "✅ Approved: [tool result]".
- **[Orphaned approvals]** If the user never responds, pending approvals stay in D1. → Lazy expiry handles this on next interaction. A periodic cleanup can be added later.
- **[Race condition]** User could click Approve twice quickly. → Use D1 update with `WHERE status = 'pending'` as an atomic check-and-set. If no rows updated, the approval was already resolved.
- **[Tool needs env bindings]** The tool's `execute` function may need env bindings (D1, R2, etc.) that aren't available in the callback context. → The callback handler has access to the full env, so it can reconstruct the tool and call `execute` directly.