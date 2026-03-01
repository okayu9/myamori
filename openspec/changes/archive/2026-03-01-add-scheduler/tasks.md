## 1. Schema & Migration

- [x] 1.1 Add `scheduledJobs` table to `src/db/schema.ts` (id, name, cronExpr, prompt, chatId, threadId, enabled, nextRunAt, createdAt, updatedAt)
- [x] 1.2 Generate D1 migration with `bunx drizzle-kit generate`

## 2. Cron Expression Parser

- [x] 2.1 Create `src/scheduler/cron.ts` with `getNextRun(cronExpr, after)` — parse 5-field cron expressions (numbers, `*`, `,`, `-`, `/`), return next Date
- [x] 2.2 Unit tests for cron parser — basic patterns (`*/5 * * * *`, `0 9 * * 1-5`, `30 8,20 * * *`), edge cases

## 3. Cron Handler

- [x] 3.1 Create `src/scheduler/handler.ts` with `handleScheduledEvent(env)` — query D1 for due jobs, enqueue to Queue, update nextRunAt
- [x] 3.2 Add `scheduled` event handler in `src/index.ts` calling `handleScheduledEvent`
- [x] 3.3 Add Queue bindings (`SCHEDULER_QUEUE`) to `Bindings` type in `src/index.ts` and `AgentWorkflowEnv` in `src/agent/workflow.ts`

## 4. Queue Consumer

- [x] 4.1 Add `queue` event handler in `src/index.ts` — receive job messages, create AgentWorkflow instances with job prompt as user message

## 5. Scheduler Tools

- [x] 5.1 Create `src/tools/scheduler.ts` with `createSchedulerTools(db, chatId, threadId)` factory
- [x] 5.2 Implement `list_scheduled_jobs` (risk: `low`) — return all jobs with status
- [x] 5.3 Implement `create_scheduled_job` (risk: `high`) — validate cron, compute nextRunAt, insert into D1
- [x] 5.4 Implement `update_scheduled_job` (risk: `high`) — update fields, recompute nextRunAt if cron changes
- [x] 5.5 Implement `delete_scheduled_job` (risk: `high`) — delete job from D1

## 6. Workflow Integration

- [x] 6.1 Register scheduler tools in `workflow.ts`
- [x] 6.2 Pass `chatId` and `threadId` from workflow params to scheduler tool factory

## 7. Tests

- [x] 7.1 Unit tests for `handleScheduledEvent` — due jobs enqueued, nextRunAt updated, no-op when no due jobs
- [x] 7.2 Unit tests for `list_scheduled_jobs`
- [x] 7.3 Unit tests for `create_scheduled_job` — validates cron, inserts row, computes nextRunAt
- [x] 7.4 Unit tests for `delete_scheduled_job` — removes row from D1

## 8. Verification

- [x] 8.1 Run `bunx vitest run` and confirm all tests pass
- [x] 8.2 Run `bunx biome check` and confirm no lint/format issues
- [x] 8.3 Run `bunx tsc --noEmit` and confirm no type errors
