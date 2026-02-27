## Context

The project has a bare `package.json` (Bun types only) and a `tsconfig.json` from `bun init`. No application code, linter, or test runner exists. All subsequent changes (Discord adapter, agent loop, etc.) depend on having these foundations in place.

## Goals / Non-Goals

**Goals:**

- Install all core dependencies needed for Phase 1 development.
- Configure Biome for linting and formatting.
- Configure Vitest with `@cloudflare/vitest-pool-workers` for Workers-compatible testing.
- Create a minimal Hono-based Worker entry point (`src/index.ts`).
- Verify the setup with a smoke test.
- Adjust `tsconfig.json` for Cloudflare Workers.

**Non-Goals:**

- Implementing any business logic (Discord, agent loop, tools, etc.).
- Setting up Drizzle migrations or D1 schema (no database usage yet).
- Creating CI workflows (separate change).
- Configuring OpenTofu infrastructure (separate change).

## Decisions

### Decision: Install all anticipated Phase 1 dependencies now

Install Hono, Drizzle ORM, Zod, Vercel AI SDK, and related packages upfront even though this change only creates a minimal entry point. This avoids a "dependency-only" change later and ensures `bun install` gives a ready-to-develop environment.

**Alternative considered**: Install dependencies incrementally per feature — rejected because each install-only PR adds overhead without functional value.

### Decision: Use `@cloudflare/vitest-pool-workers` from the start

Configure Vitest to run inside the Workers runtime via the pool-workers plugin. This ensures tests exercise the same runtime constraints (no Node.js globals, Workers API available) from day one.

**Alternative considered**: Plain Vitest without Workers pool — rejected because tests would pass locally but fail in production due to runtime differences.

### Decision: Minimal entry point (health check only)

`src/index.ts` exports a Hono app with a single `GET /` route returning 200. This is the smallest deployable Worker and proves the toolchain works end-to-end.

**Alternative considered**: No entry point (config-only change) — rejected because a smoke test needs something to test.

### Decision: Biome defaults with minimal overrides

Use Biome's recommended rules with only the overrides necessary for the project (e.g., tab width, quote style). Avoid customizing rules that match the defaults.

**Alternative considered**: ESLint + Prettier — rejected because Biome is already chosen in the project spec and is a single tool.

## Risks / Trade-offs

- [Dependency churn] Installing many packages upfront means more `bun.lock` churn in this PR → Mitigation: This is a one-time cost; subsequent PRs only add what's new.
- [Workers pool version compatibility] `@cloudflare/vitest-pool-workers` may lag behind Vitest releases → Mitigation: Pin compatible versions; update together.
