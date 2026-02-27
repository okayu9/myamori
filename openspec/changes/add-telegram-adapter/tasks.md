## 1. Types & Interface

- [x] 1.1 Create `src/channels/types.ts` with `IncomingMessage` type and `ChannelAdapter` interface
- [x] 1.2 Create Zod schema for Telegram `Update` object (message subset: `message_id`, `from`, `chat`, `text`, `message_thread_id`)

## 2. Telegram Adapter

- [x] 2.1 Create `src/channels/telegram.ts` implementing `ChannelAdapter`
- [x] 2.2 Implement `verifyRequest` — check `X-Telegram-Bot-Api-Secret-Token` header
- [x] 2.3 Implement `parseMessage` — parse `Update` body into `IncomingMessage`, return `null` for non-message updates
- [x] 2.4 Implement `sendReply` — call Telegram Bot API `sendMessage` with `chat_id`, `text`, and optional `message_thread_id`

## 3. Webhook Route

- [x] 3.1 Add `POST /telegram/webhook` route to `src/index.ts`
- [x] 3.2 Wire up verification → parse → echo reply flow using `waitUntil` for async processing
- [x] 3.3 Update `wrangler.toml.template` with any new bindings or vars if needed

## 4. Setup Script

- [x] 4.1 Create `scripts/setup-telegram-webhook.ts` that calls `setWebhook` with URL and secret token

## 5. Tests

- [x] 5.1 Unit test for `verifyRequest` (valid/invalid secret token)
- [x] 5.2 Unit test for `parseMessage` (valid message, non-message update, missing text)
- [x] 5.3 Integration test for webhook route (end-to-end: POST → verify → parse → respond 200)

## 6. Verification

- [x] 6.1 Run `bunx biome check .` — lint passes
- [x] 6.2 Run `bunx tsc --noEmit` — type check passes
- [x] 6.3 Run `bunx vitest run` — all tests pass