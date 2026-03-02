## 1. Staging Deploy Workflow

- [x] 1.1 Create `.github/workflows/deploy.yml` with trigger on push to `main`
- [x] 1.2 Add path filters: ignore `infra/**`, `openspec/**`, `**.md` (except wrangler.toml.template)
- [x] 1.3 Add `envsubst` step to generate `wrangler.toml` from template using GitHub Environment variables
- [x] 1.4 Add D1 migrations step: `wrangler d1 migrations apply <db-name> --remote --env staging`
- [x] 1.5 Add deploy step: `wrangler deploy --env staging`
- [x] 1.6 Configure GitHub Environment `staging` in workflow (variables and secrets)

## 2. Production Deploy Workflow

- [x] 2.1 Create `.github/workflows/deploy-production.yml` with `workflow_dispatch` trigger
- [x] 2.2 Add `envsubst` step to generate `wrangler.toml` from template
- [x] 2.3 Add D1 migrations step: `wrangler d1 migrations apply <db-name> --remote`
- [x] 2.4 Add deploy step: `wrangler deploy`
- [x] 2.5 Configure GitHub Environment `production` in workflow

## 3. Path Filters on Existing Workflows

- [x] 3.1 Add `paths-ignore` to `pr-checks.yml` for `infra/**`
- [x] 3.2 Add `paths-ignore` to `archive.yml` for `infra/**`

## 4. Template Compatibility

- [x] 4.1 Verify `wrangler.toml.template` has all variables needed for both staging and production `envsubst`
- [x] 4.2 Add `compatibility_flags = ["nodejs_compat"]` to `wrangler.toml.template` if missing (required for Workers runtime)
