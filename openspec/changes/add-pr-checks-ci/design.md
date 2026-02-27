## Context

The project scaffold is in place with Biome, TypeScript, and Vitest configured. CONTRIBUTING.md specifies three PR checks (lint, type check, test) that must pass before merge. No CI workflows exist for PRs yet. The archive workflow (`.github/workflows/archive.yml`) already exists for post-merge.

## Goals / Non-Goals

**Goals:**

- Run lint, type check, and test on every PR targeting `main`.
- Run the three checks in parallel for fast feedback.
- Use Bun as the runtime (consistent with project conventions).

**Non-Goals:**

- Post-merge workflows (staging deploy, production deploy — separate changes).
- Adding required status checks to the GitHub ruleset (can be done after the workflow is verified).
- Code coverage reporting.

## Decisions

### Decision: Three parallel jobs in one workflow

Run lint, type-check, and test as three separate jobs in a single workflow file. This gives parallel execution and independent failure reporting.

**Alternative considered**: Single job running all three sequentially — rejected because a lint failure would hide type/test results, slowing down the feedback loop.

### Decision: Use Bun for CI

Use `oven-sh/setup-bun` and `bun install` in CI. This matches the project's local development toolchain and avoids Node.js-specific behavior differences.

**Alternative considered**: Use Node.js + npm in CI — rejected because the project uses Bun everywhere else.

### Decision: Use `bun install --frozen-lockfile` in CI

Ensure CI uses exact versions from `bun.lock` without modifying it. This prevents version drift between local and CI environments.

## Risks / Trade-offs

- [Bun CI action stability] `oven-sh/setup-bun` is less mature than `actions/setup-node` → Mitigation: Pin to `v2`; fallback to Node.js is straightforward if needed.
- [Vitest needs wrangler.toml] The test runner requires `wrangler.toml` which is gitignored → Mitigation: Create a minimal `wrangler.toml` in the CI step before running tests.