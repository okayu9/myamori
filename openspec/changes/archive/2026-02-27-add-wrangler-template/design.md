## Context

`wrangler.toml` contains Cloudflare resource IDs (D1 database_id, R2 bucket_name) and Discord credentials that differ per developer and per environment (staging vs production). Currently no `wrangler.toml` exists yet. The infrastructure spec states that OpenTofu outputs resource IDs referenced in `wrangler.toml`.

CONTRIBUTING.md already documents the `wrangler.toml.template` → local copy workflow and the `envsubst` CI approach.

## Goals / Non-Goals

**Goals:**

- Provide a committed template that documents all required wrangler configuration fields.
- Prevent accidental commit of environment-specific values.
- Support CI/CD substitution via `envsubst` with GitHub Environment Variables.
- Define staging and production environment sections.

**Non-Goals:**

- Creating the actual CI/CD workflow files (separate change).
- Setting up GitHub Environments with Variables/Secrets (operational task).
- Managing secrets — secrets use `wrangler secret put`, not the template.

## Decisions

### Decision: `envsubst` placeholder syntax

Use `${VAR_NAME}` placeholders in the template. `envsubst` is a standard POSIX tool available in CI runners and substitutes environment variables in-place.

**Alternative considered**: Mustache/Handlebars templates — rejected because they require an extra dependency. `envsubst` is zero-dependency.

### Decision: Single template file for all environments

The template includes both the default (production) config and `[env.staging]` sections. This keeps all environment definitions in one place.

**Alternative considered**: Separate templates per environment — rejected because wrangler natively supports `[env.*]` sections and the duplication would be harder to maintain.

### Decision: Secrets excluded from template

Secrets (DISCORD_BOT_TOKEN, etc.) are set via `wrangler secret put` or GitHub Secrets and injected at runtime. They do not appear as placeholders in the template.

This aligns with the infrastructure spec's exclusion of secrets from wrangler config.

## Risks / Trade-offs

- [Placeholder drift] Template may fall out of sync as new bindings are added → Mitigation: CI can validate that all `${...}` placeholders are resolved (no literal `${` in the substituted output).
- [envsubst availability] Some minimal CI images may not have `envsubst` → Mitigation: Use `gettext` package or a shell-based fallback (`sed`). Standard GitHub Actions runners include it.
