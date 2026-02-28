## Context

The tools spec defines 5 calendar tools with CalDAV integration, two-axis read permission, and scope restriction to a dedicated calendar. The existing tool registry and approval flow are in place. The assistant currently has web search as the only tool; calendar is the first tool with mutation capabilities (create/update/delete events) and dynamic risk levels.

## Goals / Non-Goals

**Goals:**

- Connect to iCloud CalDAV using `tsdav` with app-specific password authentication
- Implement all 5 calendar tools with correct risk levels
- Track AI-created event UIDs in D1 for two-axis read permission
- Restrict access to a single dedicated calendar
- Return only permitted fields (title, time, all-day flag)

**Non-Goals:**

- Multi-calendar support (single dedicated calendar only)
- Recurring event editing (handle as single occurrences)
- Attendee management or meeting notes
- Calendar sync or caching (direct CalDAV queries each time)
- Google Calendar support (iCloud only for now, but abstract for future)

## Decisions

### 1. CalDAV client via `tsdav`

Use the `tsdav` library for CalDAV connectivity. It handles PROPFIND, REPORT, PUT, DELETE operations and iCal parsing. Enable `nodejs_compat` compatibility flag in wrangler.toml.

**Fallback:** If `tsdav` fails under Workers runtime, implement a thin CalDAV HTTP wrapper. This is a known risk documented in the spec.

### 2. Single CalDAV client factory

Create a `createCalDAVClient(env)` function that initializes and authenticates the tsdav client. Called per-request — no persistent connections (Workers are stateless).

Credentials via secrets: `CALDAV_URL`, `CALDAV_USERNAME`, `CALDAV_PASSWORD`. Calendar name via env: `CALDAV_CALENDAR_NAME` (default: "AI Assistant Shared").

### 3. Calendar UID tracking in D1

Add `calendar_uids` table with columns: `id` (primary key), `event_uid` (CalDAV UID), `created_at`. When `create_event` succeeds, insert the event UID. Used by `get_events_details` to determine risk level.

### 4. Dynamic risk level for `get_events_details`

The tool itself is registered as `low` risk, but the execute function checks each returned event's UID against D1:
- UID found in `calendar_uids` → include in response (AI-created, safe)
- UID not found → return a placeholder indicating approval is needed, and trigger the approval flow for those events

This is different from the standard risk-level gating in the registry. The tool handles its own risk logic internally because the risk depends on the data, not the tool invocation.

**Alternative considered:** Register two separate tools (`get_own_events_details`, `get_user_events_details`). Rejected — the LLM shouldn't need to know which events are AI-created; the tool handles this transparently.

### 5. iCal parsing for event data

Use `tsdav`'s built-in iCal parsing to extract event properties. Map CalDAV VEVENT fields to our tool output:
- `SUMMARY` → title
- `DTSTART`/`DTEND` → start/end times (ISO 8601)
- All-day detection: `DTSTART` with `VALUE=DATE` (no time component)
- `UID` → used for tracking and mutations

### 6. Tool registration in workflow

Add CalDAV-related env vars to `AgentWorkflowEnv`. In `workflow.ts`, conditionally register calendar tools when `CALDAV_URL` is configured (same pattern as `TAVILY_API_KEY`). Pass `db` to the calendar tool factory for UID tracking.

## Risks / Trade-offs

- **`tsdav` Workers compatibility** — `tsdav` may not work under `nodejs_compat`. → Mitigation: Test early in implementation. Fall back to raw HTTP CalDAV requests if needed (spec explicitly allows this).
- **CalDAV latency** — Each tool call makes real-time CalDAV requests to iCloud. → Mitigation: Acceptable for single-user system. Add timeout (10s) to prevent hanging.
- **Dynamic risk complexity** — `get_events_details` mixes low and high risk events in one call. → Mitigation: Split response into immediately available (AI-created) and approval-required (user-created) events. Keep the logic in the tool, not the registry.
- **iCal parsing edge cases** — Recurring events, timezone handling, all-day events spanning multiple days. → Mitigation: Start simple — treat each VEVENT as-is. Timezone conversion to ISO 8601 with timezone info.
