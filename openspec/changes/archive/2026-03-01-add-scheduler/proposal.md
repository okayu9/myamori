## Why

The assistant currently responds only to user-initiated messages. Adding a scheduler enables proactive automation — morning briefings, periodic reminders, recurring calendar checks — by polling D1 for dynamic cron jobs on a fixed 5-minute interval. This multiplies the value of existing tools (calendar, files, web search) by allowing them to run on a schedule without user interaction.

## What Changes

- Add `scheduled_jobs` table to D1 schema (job name, cron expression, prompt, next run time, enabled flag)
- Add a cron handler (`scheduled` event) that polls D1 for due jobs and enqueues them to Queues
- Add a Queue consumer that executes each job by triggering the agent workflow
- Add LLM-accessible tools: `create_scheduled_job` (high), `list_scheduled_jobs` (low), `update_scheduled_job` (high), `delete_scheduled_job` (high)
- Add a 5-minute cron trigger to `wrangler.toml`
- Add Queues binding for async job execution

## Capabilities

### New Capabilities

_(none — scheduler is already specified in the existing scheduler spec)_

### Modified Capabilities

_(none — implementing existing spec requirements, no spec-level changes needed)_

## Impact

- **New files**: `src/scheduler/handler.ts` (cron handler), `src/scheduler/cron.ts` (cron expression parser), `src/tools/scheduler.ts` (LLM tools), migrations for `scheduled_jobs` table
- **Modified files**: `src/index.ts` (add `scheduled` + `queue` handlers, bindings), `src/agent/workflow.ts` (register scheduler tools), `src/db/schema.ts` (add table)
- **Dependencies**: None new (cron parsing is lightweight, implement in-house)
- **Bindings**: `SCHEDULER_QUEUE` (Queue), cron trigger in `wrangler.toml`
