## Why

All Cloudflare resources (D1, R2, KV, Queues, Vectorize, Email Routing, DNS) are created manually via the dashboard, and their IDs are hand-copied into GitHub Environment Variables. This is error-prone, undocumented, and makes it impossible to reproduce the environment from code. The infrastructure spec already mandates OpenTofu — this change implements it.

## What Changes

- Add `infra/` directory with OpenTofu configuration files (`main.tf`, `variables.tf`, `outputs.tf`, `backend.tf`, `versions.tf`)
- Add `infra/bootstrap.sh` script to create the R2 state bucket (avoids circular dependency)
- Declare all Cloudflare resources: D1, R2, KV, Queues, Vectorize, Email Routing rules, DNS records
- Export resource IDs as OpenTofu outputs for use in `wrangler.toml`
- Add `infra-plan.yml` GitHub Actions workflow: posts `tofu plan` as PR comment on `infra/**` changes
- Add `infra-apply.yml` GitHub Actions workflow: runs `tofu apply` on merge to `main` for `infra/**` changes

## Capabilities

### New Capabilities

(No new spec capabilities — the infrastructure spec already defines all requirements for OpenTofu.)

### Modified Capabilities

(No spec-level changes. The existing `infrastructure` spec already covers OpenTofu requirements, state management, CI/CD pipelines, and directory structure. This change implements those requirements.)

## Impact

- **New directory**: `infra/` with OpenTofu HCL files
- **New workflows**: `.github/workflows/infra-plan.yml`, `.github/workflows/infra-apply.yml`
- **Dependencies**: Cloudflare provider v5 (declared in `versions.tf`)
- **Secrets**: Existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are reused; new R2 state backend credentials needed (from bootstrap)
- **No application code changes**: Worker code, Drizzle migrations, and `wrangler.toml.template` are unaffected
