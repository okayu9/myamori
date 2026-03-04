## Context

The infrastructure spec defines OpenTofu as the IaC tool for managing Cloudflare resources. Currently all resources (D1, R2, KV, Queues, Vectorize) are created manually via the Cloudflare dashboard and their IDs hand-copied into GitHub Environment Variables. The deploy pipelines (`deploy.yml`, `deploy-production.yml`) are already in place and use `envsubst` to inject these IDs into `wrangler.toml`.

The `infra/` directory does not exist yet. This change creates it with the full OpenTofu configuration and CI/CD workflows.

## Goals / Non-Goals

**Goals:**
- Declare all Cloudflare resources in OpenTofu HCL
- Store state in a dedicated R2 bucket via S3-compatible backend
- Provide a bootstrap script for initial state bucket creation
- Add `infra-plan.yml` workflow: post `tofu plan` as PR comment on `infra/**` changes
- Add `infra-apply.yml` workflow: run `tofu apply` on merge to `main` for `infra/**` changes
- Export resource IDs as OpenTofu outputs

**Non-Goals:**
- Worker code deployment (handled by `wrangler deploy`)
- D1 schema management (handled by Drizzle migrations)
- Secrets management (handled by `wrangler secret put`)
- Automatic injection of OpenTofu outputs into GitHub Variables (manual copy for now)

## Decisions

### 1. File structure under `infra/`

**Decision**: Split into `main.tf`, `variables.tf`, `outputs.tf`, `backend.tf`, `versions.tf`, and `bootstrap.sh`.

**Rationale**: Standard OpenTofu convention. `versions.tf` separates provider version constraints from backend config for clarity. `bootstrap.sh` lives alongside the infra code it supports.

### 2. State backend: R2 with S3-compatible API

**Decision**: Use the `s3` backend with R2's S3-compatible endpoint.

**Rationale**: R2 supports the S3 API, which OpenTofu's `s3` backend speaks natively. This keeps state on Cloudflare (no external dependency). The state bucket is separate from the application R2 bucket and created by `bootstrap.sh` to avoid circular dependency.

**Configuration**:
```hcl
backend "s3" {
  bucket                      = "myamori-tofu-state"
  key                         = "terraform.tfstate"
  region                      = "auto"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  skip_s3_checksum            = true
  endpoints = {
    s3 = "https://<account_id>.r2.cloudflarestorage.com"
  }
}
```

### 3. Bootstrap script approach

**Decision**: A bash script that uses `wrangler` CLI to create the state R2 bucket. The R2 API token for the S3 backend must be created manually via the Cloudflare dashboard.

**Rationale**: `wrangler r2 bucket create` is the simplest way to create an R2 bucket. The script is idempotent (checks if bucket exists first). R2 API token creation requires dashboard access, so the script outputs instructions for the manual step.

### 4. Cloudflare provider v5

**Decision**: Pin to `cloudflare/cloudflare` provider `~> 5.0`.

**Rationale**: v5 is the current major version. The `~>` constraint allows minor/patch updates while preventing breaking changes.

### 5. Resource declarations

**Decision**: Declare all resources per the infrastructure spec in `main.tf`:

| Resource | Cloudflare Resource Type | Count |
|----------|------------------------|-------|
| D1 database | `cloudflare_d1_database` | 2 (prod + staging) |
| R2 bucket | `cloudflare_r2_bucket` | 2 (prod + staging) |
| KV namespace | `cloudflare_workers_kv_namespace` | 2 (prod + staging) |
| Queue | `cloudflare_queue` | 2 (prod + staging) |
| Vectorize index | (manual — no Terraform resource yet) | — |
| Email Routing | `cloudflare_email_routing_rule` | per-address |
| DNS records | `cloudflare_record` | MX + verification |

**Rationale**: Two instances of each core resource (production and staging) match the existing two-environment setup. Vectorize has no Cloudflare provider resource as of v5, so it remains manual (documented in outputs as a known gap).

### 6. CI/CD workflows for infra

**Decision**: Two workflow files — `infra-plan.yml` (PR) and `infra-apply.yml` (push to main).

- **infra-plan.yml**: Triggered on PRs modifying `infra/**`. Runs `tofu init` + `tofu plan`, posts plan output as a PR comment. Uses `peter-evans/create-or-update-comment` action.
- **infra-apply.yml**: Triggered on push to `main` with `infra/**` path filter. Runs `tofu init` + `tofu apply -auto-approve`.

**Rationale**: Matches the infrastructure spec requirement for plan-on-PR and apply-on-merge. Separate files for different triggers, consistent with the app deploy workflow pattern.

### 7. Variable design

**Decision**: Use `terraform.tfvars` (git-ignored) for local development and GitHub Environment secrets/variables for CI.

Variables:
- `cloudflare_account_id` — Cloudflare account ID
- `domain` — Domain for DNS/Email Routing

All other values are either derived (resource names follow a naming convention) or are outputs of OpenTofu itself.

## Risks / Trade-offs

- **[Risk] R2 S3 backend compatibility** → R2's S3 API has known quirks. `skip_*` flags in backend config work around most issues. Tested by the community.
- **[Risk] Vectorize not in provider** → Cloudflare provider v5 does not have a `cloudflare_vectorize_index` resource. Vectorize indexes remain manual. Documented as a known gap.
- **[Risk] State drift from existing resources** → Resources already exist in Cloudflare. After first `tofu apply`, existing resources need to be imported with `tofu import`. The bootstrap/import sequence is documented.
- **[Risk] Plan comment noise** → Large plans create verbose PR comments. Mitigated by collapsing plan output in `<details>` tags.
- **[Trade-off] No auto-injection of outputs** → Resource IDs from `tofu output` must be manually copied to GitHub Variables. Acceptable for now since resource creation is infrequent.
