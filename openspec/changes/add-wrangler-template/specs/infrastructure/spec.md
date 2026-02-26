## ADDED Requirements

### Requirement: Wrangler Template File

The repository SHALL contain a `wrangler.toml.template` file with `${PLACEHOLDER}` syntax for all environment-specific values. `wrangler.toml` SHALL be listed in `.gitignore`.

#### Scenario: Developer sets up local environment

- **WHEN** a developer clones the repository
- **THEN** they copy `wrangler.toml.template` to `wrangler.toml` and fill in their own Cloudflare resource IDs

#### Scenario: CI deploys to an environment

- **WHEN** CI runs a deploy step
- **THEN** it substitutes GitHub Environment Variables into the template using `envsubst` to produce `wrangler.toml`

### Requirement: Environment Definitions

The template SHALL define a default (production) environment and a `staging` environment using wrangler's `[env.staging]` section.

#### Scenario: Deploy to staging

- **WHEN** CI runs `wrangler deploy --env staging`
- **THEN** the staging environment section is used, deploying to the worker named `myamori-staging`

#### Scenario: Deploy to production

- **WHEN** CI runs `wrangler deploy` without `--env`
- **THEN** the default environment section is used, deploying to the worker named `myamori`

## MODIFIED Requirements

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
├── wrangler.toml.template          # Committed template with ${PLACEHOLDERS}
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
    ├── config.yaml
    ├── specs/
    └── changes/
```

#### Scenario: Repository root contains template not config

- **WHEN** a developer inspects the repository root
- **THEN** they find `wrangler.toml.template` (committed) but not `wrangler.toml` (gitignored)
