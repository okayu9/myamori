## 1. Workflow File

- [x] 1.1 Create `.github/workflows/pr-checks.yml` with trigger on pull requests to `main`
- [x] 1.2 Add lint job: `bun install --frozen-lockfile` + `bunx biome check .`
- [x] 1.3 Add type-check job: `bun install --frozen-lockfile` + `bunx tsc --noEmit`
- [x] 1.4 Add test job: `bun install --frozen-lockfile` + create minimal `wrangler.toml` + `bunx vitest run`

## 2. Verification

- [x] 2.1 Verify workflow YAML is valid (manual review)
- [ ] 2.2 Verify the workflow runs on the PR itself (push and check)