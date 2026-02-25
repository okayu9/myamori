# Infrastructure Specification

## Purpose

Defines the IaC strategy (OpenTofu), CI/CD pipelines (GitHub Actions), and project directory structure.

## Requirements

### Requirement: OpenTofu Purpose

OpenTofu SHALL be used to declaratively manage Cloudflare resource creation, making the environment reproducible with `tofu apply`.

### Requirement: OpenTofu Managed Resources

OpenTofu SHALL manage the following resources:

- D1 database.
- R2 bucket (for file/email storage; the state bucket is created by the bootstrap script).
- KV namespace.
- Queues.
- Vectorize index.
- Email Routing rules (incoming address → Worker binding).
- DNS records (MX records for Email Workers, etc.).

### Requirement: OpenTofu Exclusions

The following SHALL NOT be managed by OpenTofu:

- **Worker code and bindings**: Managed by `wrangler.toml` + `wrangler deploy` to avoid dual management of code deployment.
- **D1 schema (table definitions)**: Managed by Drizzle ORM migrations.
- **Secrets (API keys, etc.)**: Managed by `wrangler secret put` to keep secrets out of OpenTofu state.
- **Discord app configuration**: Managed manually via Discord Developer Portal.

### Requirement: State Management

OpenTofu state SHALL be stored in a dedicated R2 bucket (S3-compatible API → S3 backend).

The state bucket SHALL be separate from the application R2 bucket.

The state bucket SHALL be created by a bootstrap script (not by OpenTofu itself, as this is a circular dependency). The bootstrap script SHALL create the R2 bucket and obtain an R2 API token.

### Requirement: Provider Version

The system SHALL use Cloudflare provider v5 (Terraform provider, OpenTofu compatible).

### Requirement: Responsibility Matrix

| What | Tool |
|------|------|
| OpenTofu's own prerequisites (state R2 bucket, etc.) | Bootstrap script |
| Cloudflare resource creation and configuration | OpenTofu |
| Worker code, bindings, cron | `wrangler.toml` + `wrangler deploy` |
| D1 schema | Drizzle migrations |
| Secrets | `wrangler secret put` |

OpenTofu SHALL output resource IDs (e.g., D1 `database_id`) that are referenced in `wrangler.toml`. These SHALL be exported via OpenTofu outputs and either manually copied or injected via a script.

---

### Requirement: CI/CD Monorepo

The project SHALL use a monorepo with GitHub Actions path filters to separate pipelines.

### Requirement: CI/CD Pipelines

The system SHALL implement the following pipelines:

- **App CI** (PR modifying `src/**`, `wrangler.toml`, `package.json`): lint (Biome) → type check (tsc) → test (Vitest).
- **App CD** (main merge modifying the above paths): Drizzle migrate → `wrangler deploy`.
- **Infra Plan** (PR modifying `infra/**`): `tofu plan` result posted as PR comment.
- **Infra Apply** (main merge modifying `infra/**`): `tofu apply`.

### Requirement: Deploy Order

App CD SHALL run Drizzle migrations before `wrangler deploy`. Schema changes MUST be applied before new code that references them.

### Requirement: Pipeline Independence

OpenTofu and app deploy pipelines SHALL be independent. Code changes SHALL NOT trigger OpenTofu runs.

### Requirement: GitHub Secrets

The CI/CD system SHALL require the following GitHub Secrets:

- `CLOUDFLARE_API_TOKEN` — Used by both OpenTofu and wrangler.
- `CLOUDFLARE_ACCOUNT_ID`.

---

### Requirement: Directory Structure

The project SHALL follow this directory layout:

```
my-assistant/
├── src/
│   ├── index.ts                    # Worker entry point (Hono app)
│   ├── channels/
│   │   ├── types.ts                # IncomingMessage, ChannelAdapter interface
│   │   ├── discord.ts              # Discord Interaction Webhook adapter
│   │   └── email-worker.ts         # Email Workers handler
│   ├── agent/
│   │   ├── loop.ts                 # Message → LLM → Tool → Reply
│   │   ├── llm.ts                  # Vercel AI SDK wrapper
│   │   ├── prompt.ts               # System prompt construction
│   │   └── memory.ts               # Short-term & long-term memory
│   ├── tools/
│   │   ├── registry.ts             # ToolDefinition, tool registration
│   │   ├── email.ts                # Forwarded email search & read
│   │   ├── calendar.ts             # CalDAV calendar (Apple Calendar)
│   │   ├── files.ts                # R2 file operations
│   │   └── web-search.ts           # Web search API
│   ├── scheduler/
│   │   ├── cron.ts                 # Cron Trigger handler
│   │   └── dynamic.ts              # Dynamic cron job management
│   ├── security/
│   │   ├── auth.ts                 # User authentication
│   │   ├── approval.ts             # Approval flow
│   │   ├── audit.ts                # Audit logging
│   │   └── rate-limit.ts           # Rate limiting
│   └── db/
│       ├── schema.ts               # Drizzle schema definitions
│       └── migrations/             # Drizzle migrations
├── wrangler.toml
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── biome.json
├── infra/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── backend.tf
│   └── bootstrap.sh
└── openspec/
    ├── project.md
    ├── specs/
    ├── changes/
    └── AGENTS.md
```
