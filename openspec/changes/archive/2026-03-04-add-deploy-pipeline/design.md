## Context

The project has two GitHub Actions workflows:
- `pr-checks.yml` — lint, type-check, test on PRs
- `archive.yml` — OpenSpec archive on push to `main`

Deployment is manual. CONTRIBUTING.md and the infrastructure spec define the target: staging auto-deploys on merge to `main`, production deploys via manual trigger. `wrangler.toml.template` uses `${PLACEHOLDER}` syntax for `envsubst` substitution.

The project uses Drizzle ORM with D1, and migrations must run before code deploy (new code may reference new tables/columns).

## Goals / Non-Goals

**Goals:**
- Automate staging deploy on every push to `main`
- Provide manual production deploy via `workflow_dispatch`
- Run D1 migrations before `wrangler deploy`
- Use GitHub Environments for secrets/variables isolation
- Add path filters per infrastructure spec (app pipelines ignore `infra/` changes)

**Non-Goals:**
- OpenTofu infra pipelines (no `infra/` directory yet — separate change)
- Rollback automation (manual `wrangler rollback` is sufficient for now)
- Deployment notifications (Telegram/Slack alerts — separate change)

## Decisions

### 1. Two separate workflow files vs. one with conditional jobs

**Decision**: Two files — `deploy.yml` (staging) and `deploy-production.yml` (production).

**Rationale**: Different triggers (`push` vs `workflow_dispatch`), different environment configs, different approval requirements. Separate files keep each workflow simple and independently auditable. GitHub Environments with protection rules can gate production.

### 2. D1 migration strategy

**Decision**: Use `wrangler d1 migrations apply <database-name> --remote` before `wrangler deploy`.

**Rationale**: Drizzle generates SQL migration files in `drizzle/migrations/`. Wrangler's built-in `d1 migrations` command applies them to remote D1 and tracks applied migrations. This is simpler than running Drizzle Kit's `migrate` against a remote D1 (which would need a direct HTTP binding). The `migrations_dir` is already configured in `wrangler.toml.template`.

### 3. `envsubst` for `wrangler.toml` generation

**Decision**: Use `envsubst` to generate `wrangler.toml` from template, with variables from GitHub Environment.

**Rationale**: This is already documented in CONTRIBUTING.md and the template uses `${VAR}` syntax. Environment-specific values (database IDs, bucket names) are stored as GitHub Environment variables, not in the repository.

### 4. Path filters on existing workflows

**Decision**: Use explicit `paths:` filter on `pr-checks.yml` to trigger only on app-related files. Add `paths-ignore: ['infra/**']` to `archive.yml`. Deploy workflows use `paths-ignore` for `infra/**`, `openspec/**`, and `**.md`.

**Rationale**: Infrastructure spec requires pipeline independence. Positive `paths:` filtering on PR checks is more precise — avoids running CI on doc-only or OpenSpec-only changes. Deploy workflows use `paths-ignore` since they should trigger on most code changes.

### 5. GitHub Environment variables

**Decision**: Use GitHub Environment variables for resource IDs, GitHub Environment secrets for API tokens.

Variables per environment:
- `D1_DATABASE_NAME`, `D1_DATABASE_ID`
- `R2_BUCKET_NAME`
- `KV_NAMESPACE_ID`
- `VECTORIZE_INDEX_NAME`
- `QUEUE_NAME`
- `STAGING_D1_DATABASE_NAME`, `STAGING_D1_DATABASE_ID`, `STAGING_R2_BUCKET_NAME`, `STAGING_KV_NAMESPACE_ID`, `STAGING_VECTORIZE_INDEX_NAME`, `STAGING_QUEUE_NAME` (staging env only, for the `[env.staging]` section in template)

Secrets (shared or per-environment):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Risks / Trade-offs

- **[Risk] Migration fails mid-deploy** → Wrangler D1 migrations are transactional per file. A failed migration aborts before deploy. Manual intervention required, but no partial state.
- **[Risk] Template variable missing** → `envsubst` silently replaces missing vars with empty string. Wrangler will fail with invalid config, so this surfaces quickly.
- **[Risk] Production accidental deploy** → Mitigated by `workflow_dispatch` (manual trigger only) and GitHub Environment protection rules (can require reviewers).
