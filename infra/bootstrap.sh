#!/usr/bin/env bash
# Bootstrap script for OpenTofu state backend.
# Creates an R2 bucket to store OpenTofu state.
#
# Prerequisites:
#   - wrangler CLI authenticated (`wrangler login`)
#   - CLOUDFLARE_ACCOUNT_ID environment variable set
#
# Usage:
#   CLOUDFLARE_ACCOUNT_ID=<your-account-id> ./infra/bootstrap.sh

set -euo pipefail

STATE_BUCKET="myamori-tofu-state"

if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "Error: CLOUDFLARE_ACCOUNT_ID is not set." >&2
  exit 1
fi

echo "==> Checking if R2 bucket '${STATE_BUCKET}' exists..."
if bunx wrangler r2 bucket list --json 2>/dev/null | bunx -bun jq -e --arg name "${STATE_BUCKET}" '.[] | select(.name == $name)' >/dev/null 2>&1; then
  echo "Bucket '${STATE_BUCKET}' already exists. Skipping creation."
else
  echo "==> Creating R2 bucket '${STATE_BUCKET}'..."
  bunx wrangler r2 bucket create "${STATE_BUCKET}"
  echo "Bucket '${STATE_BUCKET}' created."
fi

cat <<EOF

==> Bootstrap complete!

Next steps:

1. Create an R2 API token for OpenTofu state access:
   - Go to https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/r2/api-tokens
   - Create a token with "Object Read & Write" permission for bucket "${STATE_BUCKET}"
   - Save the Access Key ID and Secret Access Key

2. Configure the backend credentials. Choose one:

   a) Environment variables (recommended for CI):
      export AWS_ACCESS_KEY_ID="<r2-access-key-id>"
      export AWS_SECRET_ACCESS_KEY="<r2-secret-access-key>"

   b) Create infra/backend.tfvars (for local development):
      access_key = "<r2-access-key-id>"
      secret_key = "<r2-secret-access-key>"

3. Initialize OpenTofu:
   cd infra
   tofu init

4. Import existing resources (if they already exist in Cloudflare):
   tofu import cloudflare_d1_database.production <database-id>
   tofu import cloudflare_d1_database.staging <database-id>
   tofu import cloudflare_r2_bucket.production <account-id>/<bucket-name>
   tofu import cloudflare_r2_bucket.staging <account-id>/<bucket-name>
   tofu import cloudflare_workers_kv_namespace.production <account-id>/<namespace-id>
   tofu import cloudflare_workers_kv_namespace.staging <account-id>/<namespace-id>
   tofu import cloudflare_queue.production <account-id>/<queue-id>
   tofu import cloudflare_queue.staging <account-id>/<queue-id>
EOF
