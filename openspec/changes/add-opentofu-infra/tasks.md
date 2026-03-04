## 1. Bootstrap

- [x] 1.1 Create `infra/bootstrap.sh` — script to create R2 state bucket and generate R2 API token for OpenTofu backend
- [x] 1.2 Create `infra/.gitignore` — ignore `.terraform/`, `*.tfstate*`, `*.tfvars`, `.terraform.lock.hcl`

## 2. OpenTofu Configuration

- [x] 2.1 Create `infra/versions.tf` — pin OpenTofu version and Cloudflare provider `~> 5.0`
- [x] 2.2 Create `infra/backend.tf` — S3 backend pointing to R2 state bucket
- [x] 2.3 Create `infra/variables.tf` — input variables (`cloudflare_account_id`, `domain`)
- [x] 2.4 Create `infra/main.tf` — declare all Cloudflare resources (D1 x2, R2 x2, KV x2, Queue x2, Email Routing, DNS)
- [x] 2.5 Create `infra/outputs.tf` — export resource IDs for use in `wrangler.toml`

## 3. CI/CD Workflows

- [x] 3.1 Create `.github/workflows/infra-plan.yml` — run `tofu plan` on PRs modifying `infra/**`, post plan as PR comment
- [x] 3.2 Create `.github/workflows/infra-apply.yml` — run `tofu apply` on push to `main` modifying `infra/**`

## 4. Documentation

- [x] 4.1 Add infrastructure setup section to README or CONTRIBUTING.md — bootstrap steps, import existing resources, env variable mapping
