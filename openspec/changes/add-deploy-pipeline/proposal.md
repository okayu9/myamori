## Why

The project has PR checks (lint, type check, test) and OpenSpec archive automation, but no deployment pipeline. Every deploy to staging and production is a manual `wrangler deploy`. CONTRIBUTING.md already documents the intended flow — staging deploys on every merge to `main`, production deploys via manual trigger — but the GitHub Actions workflows don't exist yet.

## What Changes

- Add a **staging deploy workflow** (`deploy.yml`) that runs on every push to `main`:
  1. Generate `wrangler.toml` from template via `envsubst`
  2. Run Drizzle migrations against staging D1
  3. Deploy to staging with `wrangler deploy --env staging`
- Add a **production deploy workflow** (`deploy-production.yml`) triggered manually via `workflow_dispatch`:
  1. Generate `wrangler.toml` from template via `envsubst`
  2. Run Drizzle migrations against production D1
  3. Deploy to production with `wrangler deploy`
- Use [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) (`staging`, `production`) for environment-specific variables and secrets
- Add path filters to existing `pr-checks.yml` and new deploy workflows so `infra/` changes don't trigger app pipelines (per spec)

## Capabilities

### New Capabilities

_(No new spec-level capabilities — this implements existing infrastructure spec requirements for App CD pipelines.)_

### Modified Capabilities

- `infrastructure`: Implements the "CI/CD Pipelines" requirement (App CD), "Deploy Order" requirement (migrations before deploy), and "Pipeline Independence" requirement (path filters)

## Impact

- **New files**: `.github/workflows/deploy.yml`, `.github/workflows/deploy-production.yml`
- **Modified files**: `.github/workflows/pr-checks.yml` (add path filters), `.github/workflows/archive.yml` (add path filters)
- **GitHub configuration required**: Create `staging` and `production` environments with variables (`D1_DATABASE_NAME`, `D1_DATABASE_ID`, `R2_BUCKET_NAME`, `STAGING_*` variants) and secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
- **No application code changes**
