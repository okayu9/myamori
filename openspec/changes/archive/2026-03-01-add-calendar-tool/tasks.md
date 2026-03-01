## 1. Dependencies & Schema

- [x] 1.1 Install `tsdav` and verify it imports under Workers (`nodejs_compat`)
- [x] 1.2 Add `calendarUids` table to `src/db/schema.ts` (columns: `id`, `event_uid`, `created_at`)
- [x] 1.3 Generate D1 migration with `bunx drizzle-kit generate`

## 2. CalDAV Client

- [x] 2.1 Create `src/tools/calendar-client.ts` with `createCalDAVClient(env)` factory — authenticates with tsdav, returns client scoped to the dedicated calendar
- [x] 2.2 Add CalDAV bindings (`CALDAV_URL`, `CALDAV_USERNAME`, `CALDAV_PASSWORD`, `CALDAV_CALENDAR_NAME`) to `AgentWorkflowEnv` and test env

## 3. Calendar Tools

- [x] 3.1 Create `src/tools/calendar.ts` with `createCalendarTools(client, db)` factory returning an array of `ToolDefinition`
- [x] 3.2 Implement `get_events_availability` (risk: `low`) — date range input, returns time slots (start, end, all-day flag) only
- [x] 3.3 Implement `get_events_details` (risk: `low` with dynamic internal logic) — check UIDs against `calendarUids`, return AI-created event details immediately, indicate user-created events need approval
- [x] 3.4 Implement `create_event` (risk: `high`) — create via CalDAV, record UID in `calendarUids`
- [x] 3.5 Implement `update_event` (risk: `high`) — update via CalDAV
- [x] 3.6 Implement `delete_event` (risk: `high`) — delete via CalDAV, remove UID from `calendarUids` if AI-created

## 4. Workflow Integration

- [x] 4.1 Register calendar tools in `src/agent/workflow.ts` (conditional on `CALDAV_URL` being set)
- [x] 4.2 Add CalDAV bindings to `src/index.ts` Bindings type

## 5. Tests

- [x] 5.1 Unit tests for `get_events_availability` (returns time slots only, no titles)
- [x] 5.2 Unit tests for `get_events_details` (AI-created event returned, user-created event excluded)
- [x] 5.3 Unit tests for `create_event` (records UID in D1)
- [x] 5.4 Unit tests for `delete_event` (removes UID from D1)

## 6. Verification

- [x] 6.1 Run `bunx vitest run` and confirm all tests pass
- [x] 6.2 Run `bunx biome check` and confirm no lint/format issues
- [x] 6.3 Run `bunx tsc --noEmit` and confirm no type errors
