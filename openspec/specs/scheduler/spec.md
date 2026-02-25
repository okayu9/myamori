# Scheduler Specification

## Purpose

Manages fixed and dynamic cron jobs, enabling users to create scheduled tasks at runtime via Discord.

## Requirements

### Requirement: Fixed Cron

The system SHALL define a single static cron in `wrangler.toml` at a 5-minute interval.

This fixed cron SHALL be used solely to poll for dynamic cron jobs. All user-facing scheduled tasks (morning briefings, email checks, reminders, etc.) SHALL be managed as dynamic cron jobs.

### Requirement: Dynamic Cron Jobs

Users SHALL be able to create, modify, and disable scheduled jobs via Discord at runtime.

Job definitions SHALL be stored in D1.

### Requirement: Dynamic Cron Polling

On each 5-minute tick, the system SHALL:

1. Query D1 for jobs whose next execution time has passed.
2. Enqueue matching jobs to Queues for async execution.
3. Update the next execution time in D1.

### Requirement: No Static Cron Mutation

The system SHALL NOT modify `wrangler.toml` cron entries at runtime. Adding static crons would require `wrangler deploy`, which means giving the LLM access to the deployment pipeline, causes brief downtime during redeployment, and is limited by the free plan's 5-cron cap.

The D1 polling approach SHALL use a single fixed cron slot and support unlimited dynamic jobs.

### Requirement: Cost Efficiency

5-minute polling produces 288 requests/day (0.3% of Workers free tier at 100k/day). This SHALL be considered negligible.

### Requirement: LLM Cost Separation

The scheduling layer (checking "are there jobs to run?") SHALL be a single D1 SELECT query with no LLM involvement.

LLM costs SHALL only occur when a job fires and its task requires intelligent processing (e.g., "summarize this week's emails" requires an LLM call, but "notify me if there are 3+ unread emails" uses only a D1 COUNT).

Idle polling SHALL incur zero LLM cost.
