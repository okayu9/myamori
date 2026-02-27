# Scheduler Specification

## Purpose

Manages fixed and dynamic cron jobs, enabling users to create scheduled tasks at runtime via Telegram.
## Requirements
### Requirement: Fixed Cron

The system SHALL define a single static cron in `wrangler.toml` at a 5-minute interval.

This fixed cron SHALL be used solely to poll for dynamic cron jobs. All user-facing scheduled tasks (morning briefings, email checks, reminders, etc.) SHALL be managed as dynamic cron jobs.

#### Scenario: Single static cron for polling

- **WHEN** `wrangler.toml` is deployed
- **THEN** it contains exactly one cron trigger at a 5-minute interval
- **AND** the cron handler polls D1 for dynamic jobs

### Requirement: Dynamic Cron Jobs

Users SHALL be able to create, modify, and disable scheduled jobs via Telegram at runtime.

Job definitions SHALL be stored in D1.

#### Scenario: User creates a scheduled job

- **WHEN** a user requests a new scheduled job via Telegram
- **THEN** the job definition is stored in D1
- **AND** the job begins executing at the scheduled times

#### Scenario: User disables a scheduled job

- **WHEN** a user disables an existing scheduled job
- **THEN** the job is marked as disabled in D1
- **AND** the job no longer executes on subsequent polls

### Requirement: Dynamic Cron Polling

On each 5-minute tick, the system SHALL:

1. Query D1 for jobs whose next execution time has passed.
2. Enqueue matching jobs to Queues for async execution.
3. Update the next execution time in D1.

#### Scenario: Due jobs enqueued on tick

- **WHEN** the 5-minute cron fires
- **AND** there are jobs in D1 whose next execution time has passed
- **THEN** those jobs are enqueued to Queues
- **AND** their next execution time is updated in D1

#### Scenario: No due jobs

- **WHEN** the 5-minute cron fires
- **AND** no jobs have a past-due execution time
- **THEN** no jobs are enqueued

### Requirement: No Static Cron Mutation

The system SHALL NOT modify `wrangler.toml` cron entries at runtime. Adding static crons would require `wrangler deploy`, which means giving the LLM access to the deployment pipeline, causes brief downtime during redeployment, and is limited by the free plan's 5-cron cap.

The D1 polling approach SHALL use a single fixed cron slot and support unlimited dynamic jobs.

#### Scenario: No runtime cron modification

- **WHEN** a user creates a new scheduled job
- **THEN** `wrangler.toml` is not modified
- **AND** the job is stored in D1 only

### Requirement: Cost Efficiency

5-minute polling produces 288 requests/day (0.3% of Workers free tier at 100k/day). This SHALL be considered negligible.

#### Scenario: Daily polling request count

- **WHEN** the 5-minute cron runs for 24 hours
- **THEN** it produces 288 Worker invocations

### Requirement: LLM Cost Separation

The scheduling layer (checking "are there jobs to run?") SHALL be a single D1 SELECT query with no LLM involvement.

LLM costs SHALL only occur when a job fires and its task requires intelligent processing (e.g., "summarize this week's emails" requires an LLM call, but "notify me if there are 3+ unread emails" uses only a D1 COUNT).

Idle polling SHALL incur zero LLM cost.

#### Scenario: Idle poll costs no LLM tokens

- **WHEN** the cron fires
- **AND** no jobs are due
- **THEN** zero LLM API calls are made

#### Scenario: Simple job avoids LLM

- **WHEN** a due job requires only a D1 query (e.g., counting unread emails)
- **THEN** the job executes without an LLM call

