## Why

There is no cost protection — a runaway loop or excessive usage could burn through the Anthropic API budget. Rate limiting is a Phase 1 requirement (security spec) needed before adding more tools and users.

## What Changes

- Add KV-based fixed-window rate limiter for messages per user
- Reject messages that exceed the rate limit with a Telegram reply
- Add `RATE_LIMIT_KV` binding to the worker environment
- Configurable limits via environment variables (messages per window, window duration)

## Capabilities

### New Capabilities

_None — rate limiting is already defined in the `security` spec._

### Modified Capabilities

- `security`: Implementing the Rate Limiting requirement (KV-based per-user rate limiting, message rate limit with window reset)

## Impact

- `src/rate-limit/checker.ts`: new module for checking and incrementing rate limits
- `src/index.ts`: check rate limit before dispatching to workflow
- `wrangler.toml`: add KV namespace binding
- Dependencies: none (uses Cloudflare KV)
