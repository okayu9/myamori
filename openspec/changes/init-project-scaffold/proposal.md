## Why

The project has `package.json` and `tsconfig.json` from `bun init` but no application code, no linter config, and no test setup. Before building any features, the development toolchain (Biome, Vitest, Hono, Drizzle, etc.) must be installed and configured so that all subsequent changes can rely on a working lint → type-check → test pipeline.

## What Changes

- Add core dependencies: Hono, Drizzle ORM, Zod, Vercel AI SDK, Vitest, Biome, and Cloudflare Workers types.
- Create `biome.json` with lint and format rules.
- Configure Vitest with `@cloudflare/vitest-pool-workers`.
- Create a minimal `src/index.ts` Worker entry point (Hono app returning 200 on `/`).
- Create a smoke test to verify the Worker starts.
- Update `tsconfig.json` for Cloudflare Workers compatibility.

## Capabilities

### New Capabilities

_None — this is project scaffolding, not a new behavioral capability._

### Modified Capabilities

- `infrastructure`: Adds concrete toolchain configuration (Biome, Vitest, Hono) to the project, fulfilling the directory structure and CI prerequisites defined in the spec.

## Impact

- **Files added**: `biome.json`, `vitest.config.ts`, `src/index.ts`, `test/unit/index.test.ts`
- **Files modified**: `package.json`, `tsconfig.json`
- **Dependencies**: Hono, Drizzle ORM, drizzle-kit, Zod, ai (Vercel AI SDK), @ai-sdk/anthropic, Vitest, @cloudflare/vitest-pool-workers, @cloudflare/workers-types, Biome, wrangler
