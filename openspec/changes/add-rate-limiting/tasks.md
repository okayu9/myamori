## 1. Rate Limit Module

- [x] 1.1 Create `src/rate-limit/checker.ts` with `checkRateLimit(kv, userId, max, windowMs)` — returns `{ allowed: boolean; remaining: number }`
- [x] 1.2 Use fixed window counter: KV key `ratelimit:{userId}:{windowKey}`, increment on each call, TTL = window duration

## 2. Webhook Integration

- [x] 2.1 Add `RATE_LIMIT_KV` (KVNamespace) and optional `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS` to Bindings type in `src/index.ts`
- [x] 2.2 Check rate limit after auth, before workflow dispatch — reply and return on rejection
- [x] 2.3 Add KV namespace binding to `vitest.config.ts` for tests

## 3. Tests

- [x] 3.1 Unit tests for `checkRateLimit` (first message allowed, limit exceeded, window reset)
- [x] 3.2 Integration test for rate-limited webhook request

## 4. Verification

- [x] 4.1 Run `bunx vitest run` and confirm all tests pass
- [x] 4.2 Run `bunx biome check` and confirm no lint/format issues
- [x] 4.3 Run `bunx tsc --noEmit` and confirm no type errors
