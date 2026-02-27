## Context

The Worker (`src/index.ts`) currently exports a Hono app with a single `GET /` health check. The `channels` spec defines the `ChannelAdapter` interface and Telegram-specific requirements (webhook verification, async response, topic-based conversations, message normalization). This change implements the Telegram adapter as the first channel, establishing the pattern for future adapters.

## Goals / Non-Goals

**Goals:**

- Implement the `ChannelAdapter` interface and `IncomingMessage` type
- Handle Telegram Bot API webhook requests end-to-end
- Verify webhook authenticity via secret token header
- Parse `Update` objects into `IncomingMessage` with topic support
- Reply asynchronously via `sendMessage` using `waitUntil`
- Provide a setup script for `setWebhook` registration

**Non-Goals:**

- Agent loop / LLM integration (separate change)
- Callback query handling for approval flow (Phase 2)
- File/photo attachment processing (stub the field, don't parse content)
- User authentication via allowlist (separate security change)

## Decisions

### 1. No Telegram SDK — use raw `fetch`

Telegram Bot API is a straightforward REST API. Libraries like `node-telegram-bot-api` or `grammy` add WebSocket/polling support and Node.js dependencies that complicate Workers compatibility. Plain `fetch` calls to `https://api.telegram.org/bot<token>/<method>` are sufficient.

**Alternative considered**: grammY framework — supports Workers but adds 50KB+ dependency for functionality we don't need (polling, middleware chain, session). Our adapter pattern already provides the abstraction layer.

### 2. Webhook route: `POST /telegram/webhook`

A dedicated path under `/telegram/` keeps the URL namespace clean for future adapters (`/slack/webhook`, etc.). The Hono route verifies the secret token header before parsing the body.

### 3. Async response via `waitUntil`

The webhook handler returns `200 OK` immediately and processes the message in `ctx.executionContext.waitUntil()`. The actual reply is sent via `POST /sendMessage` to the Bot API. This matches the `channels` spec requirement and avoids Telegram's webhook timeout (60 seconds, generous but still bounded).

### 4. `IncomingMessage` shape

```typescript
interface IncomingMessage {
  userId: string;       // Telegram user ID (numeric, stored as string)
  text: string;         // Message text content
  chatId: string;       // Telegram chat ID (the supergroup)
  threadId?: number;    // message_thread_id for Forum topics
  attachments: Attachment[];  // Stub: photo/document metadata
  raw: unknown;         // Original Update object for future needs
}
```

`userId` and `chatId` are strings (not numbers) to keep the interface platform-agnostic. The `raw` field preserves the original payload without the interface needing to know about Telegram-specific fields.

### 5. `ChannelAdapter` interface

```typescript
interface ChannelAdapter {
  verifyRequest(req: Request): Promise<boolean>;
  parseMessage(req: Request): Promise<IncomingMessage | null>;
  sendReply(chatId: string, text: string, threadId?: number): Promise<void>;
}
```

Kept minimal for Phase 1. `sendApprovalRequest` will be added when the approval flow is implemented (Phase 2). `parseMessage` returns `null` for non-message updates (edited messages, channel posts, etc.) that we don't handle yet.

### 6. Webhook setup script

A standalone `scripts/setup-telegram-webhook.ts` that calls `setWebhook` with the Worker URL and secret token. Run manually after deploy. Uses environment variables (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `WEBHOOK_URL`) — not wrangler bindings, since this runs locally.

## Risks / Trade-offs

- **[Risk] Telegram API changes**: Telegram Bot API is stable and versioned, but we have no SDK abstracting it. → Mitigation: Zod schema for `Update` parsing catches unexpected shape changes early.
- **[Risk] `waitUntil` failures are silent**: If the async processing throws after returning 200, Telegram won't know. → Mitigation: Acceptable for now; error logging will be added with the audit system.
- **[Trade-off] Echo stub instead of real agent**: The adapter returns the user's text as-is. This is intentional — it lets us test the full webhook flow before adding LLM complexity.