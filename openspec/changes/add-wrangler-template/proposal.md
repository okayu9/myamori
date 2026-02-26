## Why

The project needs multiple developers and CI/CD to deploy to separate Cloudflare environments (staging, production). `wrangler.toml` contains environment-specific resource IDs (D1 database_id, R2 bucket name, etc.) and cannot be committed as-is. A template-based approach lets each developer and CI substitute their own values.

## What Changes

- Add `wrangler.toml.template` with `${PLACEHOLDER}` variables for all environment-specific values.
- Add `wrangler.toml` to `.gitignore` so each developer's local copy stays out of version control.
- Define staging (`--env staging`) and production (default) environments in the template.

## Capabilities

### New Capabilities

_None — this is a configuration change, not a new behavioral capability._

### Modified Capabilities

- `infrastructure`: Adds wrangler.toml template management and staging/production environment definitions to the CI/CD and directory structure requirements.

## Impact

- **Files added**: `wrangler.toml.template`
- **Files modified**: `.gitignore`
- **CI/CD**: Deploy steps will use `envsubst < wrangler.toml.template > wrangler.toml` before `wrangler deploy`.
- **Developer setup**: `cp wrangler.toml.template wrangler.toml` then fill in values (documented in CONTRIBUTING.md).
- **Infrastructure spec**: Directory structure shows `wrangler.toml` but needs to account for the template pattern.
