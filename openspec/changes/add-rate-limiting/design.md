## Context

The security spec requires KV-based per-user rate limiting for messages and LLM invocations. Currently there is no cost protection — any allowlisted user can send unlimited messages. The webhook handler (`src/index.ts`) is the natural enforcement point since it processes all incoming Telegram messages before dispatching to the agent workflow.

## Goals / Non-Goals

**Goals:**

- Enforce a per-user message rate limit using Cloudflare KV
- Reject over-limit messages with a friendly Telegram reply
- Make limits configurable via environment variables
- Keep the implementation simple (single fixed window counter)

**Non-Goals:**

- Per-tool or per-LLM-call rate limiting (message-level is sufficient for cost protection)
- Token-based rate limiting (too complex for Phase 1)
- Rate limit dashboard or analytics
- Different rate limits per user (single global config)

## Decisions

### 1. Fixed window counter in KV

Use a fixed window approach: KV key = `ratelimit:{userId}:{windowKey}`, value = message count. The window key is `Math.floor(Date.now() / windowMs)`. Each message increments the counter. KV TTL is set to the window duration so keys auto-expire.

**Alternative considered:** Sliding window log (store timestamps of each request). Rejected — requires reading and writing arrays, more KV operations, unnecessary complexity for Phase 1.

### 2. Check at webhook handler level

Rate limit check happens in `src/index.ts` after auth check, before workflow dispatch. This is the single entry point for all user messages.

**Alternative considered:** Check inside the workflow step. Rejected — the workflow is already created and consuming resources by that point.

### 3. Environment-based configuration

- `RATE_LIMIT_MAX` (default: 20) — max messages per window
- `RATE_LIMIT_WINDOW_MS` (default: 3600000 / 1 hour) — window size in milliseconds

Stored as optional env vars with sensible defaults. No need for a config file.

### 4. Reply on rejection

When rate-limited, send a Telegram reply: "You've reached the message limit. Please try again later." Then return `{ ok: true }` — don't process the message further.

### 5. KV namespace binding

Add `RATE_LIMIT_KV` as a KV namespace binding. Use a dedicated namespace (not shared with other features) for clean separation and easy purging.

## Risks / Trade-offs

- **Fixed window edge burst** — A user could send 20 messages at the end of one window and 20 at the start of the next, effectively 40 in quick succession. → Mitigation: Acceptable for Phase 1 cost protection. Switch to sliding window if needed later.
- **KV eventual consistency** — KV reads may be slightly stale across edge locations. → Mitigation: Single-user system, so consistency is not a concern.
- **KV write latency** — `put` is async but fast. Using `waitUntil` or fire-and-forget is unnecessary since the webhook must wait for the count check anyway.
