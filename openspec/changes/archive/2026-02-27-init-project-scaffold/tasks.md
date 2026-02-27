## 1. Dependencies

- [x] 1.1 Add production dependencies to `package.json` (hono, drizzle-orm, zod, ai, @ai-sdk/anthropic)
- [x] 1.2 Add dev dependencies to `package.json` (vitest, @cloudflare/vitest-pool-workers, @cloudflare/workers-types, wrangler, @biomejs/biome, drizzle-kit)
- [x] 1.3 Run `bun install`

## 2. Configuration

- [x] 2.1 Create `biome.json` with recommended rules
- [x] 2.2 Update `tsconfig.json` for Cloudflare Workers types
- [x] 2.3 Create `vitest.config.ts` with `@cloudflare/vitest-pool-workers` pool

## 3. Application Scaffold

- [x] 3.1 Create `src/index.ts` with minimal Hono app (GET `/` → 200)

## 4. Testing

- [x] 4.1 Create `test/unit/index.test.ts` smoke test (GET `/` returns 200)

## 5. Verification

- [x] 5.1 Verify `bunx biome check .` passes
- [x] 5.2 Verify `bunx tsc --noEmit` passes
- [x] 5.3 Verify `bunx vitest run` passes
