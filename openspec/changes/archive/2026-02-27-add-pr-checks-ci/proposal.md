## Why

CONTRIBUTING.md defines PR checks (Biome lint, tsc type check, Vitest) as required before merge, but no CI workflow exists to enforce them. Without automated checks, broken code can be merged to `main`.

## What Changes

- Add a GitHub Actions workflow (`.github/workflows/pr-checks.yml`) that triggers on pull requests targeting `main`.
- The workflow runs three checks in parallel: `bunx biome check .`, `bunx tsc --noEmit`, and `bunx vitest run`.
- All three must pass for the PR to be mergeable.

## Capabilities

### New Capabilities

_None — this is CI/CD automation, not a new behavioral capability._

### Modified Capabilities

- `infrastructure`: Adds the PR checks workflow to the CI/CD pipeline, fulfilling the PR Checks requirement.

## Impact

- **Files added**: `.github/workflows/pr-checks.yml`
- **Dependencies**: None (uses tools already in `devDependencies`).
- **Permissions**: Read-only (no write access needed).