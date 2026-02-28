## Why

The Worker currently has only a health-check endpoint (`GET /`). To receive user messages, it needs a Telegram Bot Webhook endpoint that verifies requests, normalizes messages, and replies asynchronously — the foundational entry point for all user interactions.

## What Changes

- Define `ChannelAdapter` interface and `IncomingMessage` type (`src/channels/types.ts`)
- Implement Telegram adapter (`src/channels/telegram.ts`) with secret token verification, `Update` parsing, topic-aware `sendMessage` replies
- Integrate Telegram webhook route into Hono app (`POST /telegram/webhook`)
- Add a setup script to register the webhook URL via `setWebhook` (`scripts/setup-telegram-webhook.ts`)
- Stub the agent response (echo the user's message back) — actual LLM integration is a separate change

## Capabilities

### New Capabilities

None — this change implements requirements already defined in existing specs.

### Modified Capabilities

None — no spec-level requirements are changing. This is a pure implementation of existing `channels` spec requirements.

## Impact

- **Code**: New files in `src/channels/`, modified `src/index.ts`, new `scripts/` directory
- **Dependencies**: None added — Telegram Bot API is plain HTTP (`fetch`), no library needed
- **Secrets**: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` required via `wrangler secret put` (and `.dev.vars` for local dev)
- **External setup**: Bot must be created via BotFather, supergroup with Topics enabled, webhook URL set after deploy
