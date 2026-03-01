## Context

The assistant currently only responds to user-initiated Telegram messages. The scheduler spec defines a polling-based dynamic cron system: a fixed 5-minute cron polls D1 for due jobs, enqueues them to Queues, and a consumer triggers the agent workflow for each job.

Existing infrastructure: D1 (Drizzle ORM), Queues (not yet used), Workflows (agent loop), Hono (HTTP handler). The `scheduled` and `queue` event handlers in Cloudflare Workers are new entry points.

## Goals / Non-Goals

**Goals:**

- Implement the full scheduler spec: fixed cron polling, D1 job storage, Queues async execution
- Add four LLM-accessible tools for job CRUD
- Keep idle polling at zero LLM cost (D1 SELECT only)
- Support simple cron expressions for scheduling (e.g., `0 9 * * *` for daily 9 AM)

**Non-Goals:**

- Complex cron features (second-level precision, timezone-aware expressions, job dependencies)
- Job execution history / logging beyond existing audit logging
- Concurrent job execution limits (single-user system)
- UI for job management (Telegram chat is the interface)

## Decisions

### 1. D1 `scheduled_jobs` table schema

```
id          TEXT PRIMARY KEY
name        TEXT NOT NULL
cronExpr    TEXT NOT NULL        -- standard 5-field cron expression
prompt      TEXT NOT NULL        -- message sent to the agent workflow
chatId      TEXT NOT NULL        -- Telegram chat to send results to
threadId    INTEGER              -- optional topic thread
enabled     INTEGER NOT NULL DEFAULT 1
nextRunAt   TEXT NOT NULL        -- ISO 8601 timestamp
createdAt   TEXT NOT NULL
updatedAt   TEXT NOT NULL
```

`nextRunAt` is pre-computed on create/update for efficient polling (`WHERE enabled = 1 AND nextRunAt <= now`).

### 2. Cron expression parser — minimal in-house

Standard 5-field format: `minute hour day-of-month month day-of-week`. Only need `getNextRun(cronExpr, after)` to compute the next execution time. No external dependency — a 50-line parser covers the required subset (numbers, `*`, `,`, `-`, `/`).

### 3. Cron handler → Queues → Workflow

The `scheduled` event handler:
1. Queries D1 for due jobs (`enabled = 1 AND nextRunAt <= now`)
2. For each due job, sends a message to the Queue with `{ jobId, chatId, prompt, threadId }`
3. Updates `nextRunAt` for each enqueued job

The Queue consumer:
1. Receives the job message
2. Creates an `AgentWorkflow` instance with `chatId` and `prompt` as the user message

This separation ensures the cron handler is fast (D1 only, no LLM) and job execution is async with retry support via Queues.

### 4. Scheduler tools — same pattern as calendar/files

`createSchedulerTools(db)` factory returning four `ToolDefinition`:

- `create_scheduled_job` (high risk): accepts name, cronExpr, prompt; validates cron, computes nextRunAt, inserts into D1
- `list_scheduled_jobs` (low risk): returns all jobs with status
- `update_scheduled_job` (high risk): accepts jobId and optional fields (name, cronExpr, prompt, enabled); recomputes nextRunAt if cron changes
- `delete_scheduled_job` (high risk): deletes job from D1

All mutation tools are high risk (approval required) since they create persistent automated actions.

### 5. `chatId` sourcing for scheduled jobs

When the LLM creates a job, the `chatId` from the current conversation is used. This ensures job results are sent to the correct Telegram chat. Stored in the `scheduled_jobs` row.

### 6. Queue binding and wrangler.toml changes

```toml
[triggers]
crons = ["*/5 * * * *"]

[[queues.producers]]
binding = "SCHEDULER_QUEUE"
queue = "myamori-scheduler"

[[queues.consumers]]
queue = "myamori-scheduler"
max_batch_size = 10
max_retries = 3
```

## Risks / Trade-offs

- **5-minute granularity** — Jobs run at most every 5 minutes, not exact to the second. → Mitigation: Acceptable for personal assistant use cases (briefings, reminders). The spec explicitly defines this.
- **Cron parser limitations** — In-house parser covers basic patterns but not all edge cases (e.g., `L`, `W`, `#` modifiers). → Mitigation: Standard 5-field cron covers 99% of use cases. Document supported syntax in tool description.
- **Queue ordering** — Queues don't guarantee ordering, so jobs may execute in any order within a batch. → Mitigation: Jobs are independent; ordering doesn't matter for the current use cases.
- **Missed ticks** — If the cron handler fails or is slow, jobs may be delayed. → Mitigation: `nextRunAt <= now` catches up on the next tick. No jobs are lost.
