# Myamori

Personal AI assistant running on [Cloudflare Workers](https://developers.cloudflare.com/workers/), accessible via Telegram. Powered by Anthropic Claude through the [Vercel AI SDK](https://sdk.vercel.ai/).

## Features

- **Telegram Bot** — Multi-turn conversations with persistent history
- **Calendar** — Read, create, update, and delete events via CalDAV (iCloud supported)
- **Email** — Forward emails to the bot for automatic parsing and summarization
- **Web Search** — Search the web via [Tavily](https://tavily.com/)
- **File Storage** — Store and retrieve files in Cloudflare R2
- **Scheduler** — Create recurring jobs with cron expressions
- **Long-term Memory** — Conversation summaries stored as vector embeddings for context recall
- **Approval Flow** — High-risk operations (e.g. creating/deleting jobs) require explicit user approval via inline buttons
- **Rate Limiting** — Configurable per-user rate limits via KV
- **Audit Logging** — All LLM calls and tool executions are logged

## Architecture

```text
Telegram ─── webhook ──▶ Cloudflare Worker ──▶ Workflow (durable execution)
                              │                       │
                              │                       ├── Claude LLM (Anthropic API)
                              │                       ├── Tool execution loop
                              │                       └── Memory retrieval (Vectorize)
                              │
                              ├── D1        (conversation history, scheduled jobs, approvals)
                              ├── R2        (file storage)
                              ├── KV        (rate limiting)
                              ├── Queues    (async job processing)
                              └── Vectorize (vector embeddings for memory)
```

Infrastructure is managed declaratively with [OpenTofu](https://opentofu.org/) in the `infra/` directory.

## Prerequisites

- [Bun](https://bun.sh) — Runtime & package manager
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) — Cloudflare Workers CLI
- A Cloudflare account with Workers, D1, R2, KV, and Queues enabled
- An [Anthropic API key](https://console.anthropic.com/)
- A [Telegram bot token](https://core.telegram.org/bots#how-do-i-create-a-bot) (via BotFather)

## Quick Start

```sh
git clone https://github.com/okayu9/myamori.git && cd myamori
bun install
cp wrangler.toml.template wrangler.toml   # Fill in your Cloudflare resource IDs
```

Configure secrets:

```sh
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put TELEGRAM_WEBHOOK_SECRET
bunx wrangler secret put ANTHROPIC_API_KEY
bunx wrangler secret put ALLOWED_USER_IDS        # Comma-separated Telegram user IDs
```

Optional secrets for additional features:

```sh
bunx wrangler secret put TAVILY_API_KEY           # Web search
bunx wrangler secret put CALDAV_URL               # Calendar (e.g. https://caldav.icloud.com)
bunx wrangler secret put CALDAV_USERNAME
bunx wrangler secret put CALDAV_PASSWORD
bunx wrangler secret put CALDAV_CALENDAR_NAME
bunx wrangler secret put TIMEZONE                 # e.g. Asia/Tokyo
bunx wrangler secret put ANTHROPIC_MODEL          # e.g. claude-sonnet-4-6 (default: claude-haiku-4-5)
```

Deploy and register the webhook:

```sh
bunx wrangler deploy
curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<YOUR_WORKER>/telegram/webhook&secret_token=<YOUR_WEBHOOK_SECRET>"
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full setup instructions including infrastructure provisioning with OpenTofu.

## Development

```sh
bunx vitest run          # Run all tests
bunx vitest              # Watch mode
bunx biome check .       # Lint & format
bunx tsc --noEmit        # Type check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, branch naming conventions, and CI pipeline details.

## Deployment

| Environment  | Trigger                          | Command                             |
|-------------|----------------------------------|-------------------------------------|
| **Staging**    | Automatic on merge to `main`     | `wrangler deploy --env staging`     |
| **Production** | Manual via GitHub Actions        | `wrangler deploy`                   |
