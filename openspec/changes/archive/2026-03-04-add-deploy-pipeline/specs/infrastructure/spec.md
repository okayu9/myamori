## MODIFIED Requirements

### Requirement: CI/CD Pipelines

The system SHALL implement the following pipelines:

- **App CI** (PR targeting `main`, modifying `src/**`, `wrangler.toml.template`, `package.json`, `drizzle/**`): lint (Biome) → type check (tsc) → test (Vitest).
- **App CD — Staging** (push to `main`, modifying app paths): Generate `wrangler.toml` via `envsubst` → D1 migrations → `wrangler deploy --env staging`.
- **App CD — Production** (manual `workflow_dispatch`): Generate `wrangler.toml` via `envsubst` → D1 migrations → `wrangler deploy`.
- **Infra Plan** (PR modifying `infra/**`): `tofu plan` result posted as PR comment.
- **Infra Apply** (main merge modifying `infra/**`): `tofu apply`.

#### Scenario: App CI runs on source changes

- **WHEN** a PR modifies files in `src/`, `wrangler.toml.template`, `drizzle/`, or `package.json`
- **THEN** the App CI pipeline runs lint, type check, and test

#### Scenario: Staging deploy on merge to main

- **WHEN** a push to `main` modifies app-related files
- **THEN** the staging deploy pipeline generates `wrangler.toml` from template
- **AND** applies D1 migrations to the staging database
- **AND** deploys to the staging environment

#### Scenario: Production deploy on manual trigger

- **WHEN** a `workflow_dispatch` event is triggered on the production deploy workflow
- **THEN** the production deploy pipeline generates `wrangler.toml` from template
- **AND** applies D1 migrations to the production database
- **AND** deploys to the production environment

#### Scenario: Infra plan posted on PR

- **WHEN** a PR modifies files in `infra/`
- **THEN** the `tofu plan` output is posted as a PR comment

### Requirement: Deploy Order

App CD SHALL run D1 migrations before `wrangler deploy`. Schema changes MUST be applied before new code that references them.

The migration command SHALL be `wrangler d1 migrations apply <database-name> --remote`.

#### Scenario: Migrations run before deploy

- **WHEN** the App CD pipeline runs
- **THEN** D1 migrations are applied before `wrangler deploy`

#### Scenario: Migration failure aborts deploy

- **WHEN** a D1 migration fails
- **THEN** the `wrangler deploy` step does NOT execute
- **AND** the workflow fails with an error

### Requirement: CI/CD Monorepo

The project SHALL use a monorepo with GitHub Actions path filters to separate pipelines.

App CI and App CD workflows SHALL ignore changes to `infra/**` and `openspec/**`.

#### Scenario: Path-filtered pipelines

- **WHEN** a PR modifies files only in `infra/`
- **THEN** only the infrastructure pipeline runs
- **AND** the app pipeline does not run

#### Scenario: Spec-only changes skip deploy

- **WHEN** a push to `main` modifies only files in `openspec/`
- **THEN** the deploy pipeline does not run

### Requirement: Pipeline Independence

OpenTofu and app deploy pipelines SHALL be independent. Code changes SHALL NOT trigger OpenTofu runs.

#### Scenario: Code change does not trigger infra

- **WHEN** a commit modifies only `src/` files
- **THEN** the OpenTofu pipeline does not run
