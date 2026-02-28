## Context

The Telegram adapter is complete: incoming messages are verified, parsed, and echoed back. The next step is to replace the echo with an actual LLM-powered agent loop.

Both `ai@6.0.103` and `@ai-sdk/anthropic@3.0.48` are already installed. Drizzle ORM (`drizzle-orm@0.45.1`) and drizzle-kit are installed but no schema or config exists yet.

This change implements the minimal text-response path only. Tool calls, approval flow, audit logging, and rate limiting are deferred to separate changes.

## Goals / Non-Goals

**Goals:**

- Wire up the agent loop: allowlist → history → system prompt → LLM → reply → save
- Use Cloudflare Workflows for durable execution with per-step retry and timeout
- Store conversation history in D1 via Drizzle ORM
- Build a dynamic system prompt with role, date/time, and tools placeholder
- Use Vercel AI SDK with Anthropic provider for LLM calls
- Silently ignore messages from non-allowlisted users
- Handle LLM failures gracefully with error reply to user

**Non-Goals:**

- Tool execution (no tools registered yet)
- Approval flow for high-risk operations (Workflows `waitForApproval` will be used in a future change)
- Audit logging
- Rate limiting
- Long-term memory / Vectorize

## Decisions

### 1. Cloudflare Workflows for agent execution

Use Cloudflare Workflows instead of `waitUntil` or Queues. The webhook handler dispatches a Workflow instance; each step runs independently with its own timeout and retry.

```text
Telegram → fetch() handler → env.AGENT_WORKFLOW.create(params) → 200 OK
           (数ms で完了、Telegram に即応答)

Workflow instance (独立した実行コンテキスト、最大15分/step):
  step 1: load-history    — D1 から会話履歴取得
  step 2: call-llm        — Vercel AI SDK で LLM 呼び出し (retry: 3, timeout: 5min)
  step 3: send-reply      — Telegram sendMessage
  step 4: save-history    — D1 に会話保存
```

**Why not `waitUntil`:** 30-second limit after response. LLM calls can exceed this.

**Why not Queues:** No built-in per-step retry, no approval flow support, no `sleep`. Would need to reimplement what Workflows provides.

**Why Workflows:**
- Per-step timeout (up to 15 min) and retry with exponential backoff
- Durable: if step 3 fails, step 1-2 results are preserved
- `waitForApproval` fits the future approval flow spec exactly
- `step.sleep` enables future scheduling features
- Status API for observability

### 2. LLM Model: configurable, default `claude-haiku-4-5`

Store model ID in `ANTHROPIC_MODEL` environment variable, defaulting to `claude-haiku-4-5`. This allows switching to Sonnet/Opus without code changes. Workflows' per-step timeout (5 min) accommodates slower models.

**Alternatives considered:**
- Hardcoded model — inflexible, can't switch without deploy
- Runtime model selection per message — overengineered for single-user

### 3. Conversation History: D1 + Drizzle ORM

Create a `messages` table in D1 to store conversation turns. Load the most recent 20 messages per chat as context for each LLM call.

Schema:
```text
messages:
  id          TEXT PRIMARY KEY (nanoid)
  chat_id     TEXT NOT NULL
  role        TEXT NOT NULL ('user' | 'assistant')
  content     TEXT NOT NULL
  created_at  TEXT NOT NULL (ISO 8601)

INDEX idx_messages_chat_created ON messages(chat_id, created_at)
```

**Alternatives considered:**
- KV for history — no relational queries, harder to order by time
- Full AI SDK message format — too complex until tool calls are added

### 4. Allowlist: Env var `ALLOWED_USER_IDS`

Comma-separated Telegram user IDs stored as a Cloudflare secret. Checked in the webhook handler before dispatching the Workflow. Non-allowlisted messages return 200 with `{ ok: true }` (silent ignore per spec).

**Alternatives considered:**
- D1 table for users — overengineered for single-user

### 5. Module Structure

```text
src/
  agent/
    workflow.ts     — WorkflowEntrypoint with step definitions
    prompt.ts       — buildSystemPrompt()
    history.ts      — loadHistory() / saveMessages()
  db/
    schema.ts       — Drizzle table definitions
    index.ts        — drizzle(env.DB) helper
  index.ts          — webhook handler dispatches Workflow
```

### 6. Webhook Handler Flow

```ts
app.post("/telegram/webhook", async (c) => {
  // 1. Verify request (existing)
  // 2. Parse message (existing)
  // 3. Check allowlist — reject silently if not allowed
  // 4. Dispatch Workflow: env.AGENT_WORKFLOW.create({ message })
  // 5. Return 200 immediately
});
```

The handler no longer calls `sendReply` directly. All processing happens in the Workflow.

### 7. Drizzle Config and Migrations

Create `drizzle.config.ts` at project root. Migrations generated with `bunx drizzle-kit generate` and applied with `wrangler d1 migrations apply`.

Migration files in `drizzle/migrations/`.

## Risks / Trade-offs

- **[Workflows beta]** Workflows is in open beta. Step limit was recently raised from 512 to 1024. API may change. → Acceptable for a personal project; the feature set is stable enough for our use case.
- **[Step serialization]** Step results must be JSON-serializable (max 1 MiB). Conversation history fits comfortably. → If messages grow large, truncate older messages before persisting step state.
- **[Workflow dispatch latency]** Creating a Workflow instance adds a small delay (~100ms) compared to inline processing. → Imperceptible for a chat bot; reliability is more important than latency.
- **[Error visibility]** If the Workflow fails silently, the user gets no reply. → Step 2 (call-llm) catches errors and falls back to sending an error message via Telegram in step 3.
- **[D1 access from Workflow]** Workflows access D1 via `this.env.DB` binding, same as regular Workers. → No additional configuration needed beyond wrangler.toml bindings.