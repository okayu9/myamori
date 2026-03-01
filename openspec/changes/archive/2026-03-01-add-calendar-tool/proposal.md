## Why

Calendar integration is a core Phase 2 capability. The assistant needs to check availability, read event details, and create/update/delete events on behalf of the user. Without this, the assistant cannot help with scheduling — one of the primary use cases.

## What Changes

- Add `tsdav` library for iCloud CalDAV connectivity
- Implement 5 calendar tools: `get_events_availability`, `get_events_details`, `create_event`, `update_event`, `delete_event`
- Add `calendar_uids` D1 table to track AI-created events (for two-axis read permission)
- Register calendar tools in the tool registry with appropriate risk levels
- Add CalDAV credentials (`CALDAV_URL`, `CALDAV_USERNAME`, `CALDAV_PASSWORD`, `CALDAV_CALENDAR_NAME`) to worker bindings

## Capabilities

### New Capabilities

_None — calendar tools are already defined in the `tools` spec._

### Modified Capabilities

- `tools`: Implementing the Calendar requirements (Protocol, Scope Restriction, Tools, Two-Axis Read Permission, Workers Compatibility)

## Impact

- `src/tools/calendar.ts`: new module for CalDAV client and calendar tool definitions
- `src/db/schema.ts`: add `calendar_uids` table
- `src/index.ts`: register calendar tools in the tool registry
- `src/agent/workflow.ts`: pass CalDAV bindings to tool registry
- Dependencies: `tsdav` (CalDAV client library)
