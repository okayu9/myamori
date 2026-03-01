## MODIFIED Requirements

### Requirement: Calendar — Tools

The system SHALL provide the following calendar tools:

- **`get_events_availability`** (risk: `low`): Returns time slots only (start, end, all-day flag) with no titles or details. Accepts a date range (start date, end date).
- **`get_events_details`** (risk: dynamic, see Two-Axis Read Permission): Returns events with titles and details. Accepts a date range (start date, end date). Events created by the assistant are returned immediately; user-created events trigger the approval flow.
- **`create_event`** (risk: `high`): Creates an event. Approval required. Accepts title, start time, end time, and optional all-day flag. Records the event UID in D1 after creation.
- **`update_event`** (risk: `high`): Updates an event. Approval required. Accepts event UID, and optional title, start time, end time, all-day flag.
- **`delete_event`** (risk: `high`): Deletes an event. Approval required. Accepts event UID. Removes the UID from D1 if it was AI-created.

All date/time inputs and outputs SHALL use ISO 8601 format.

#### Scenario: Availability check returns time slots only

- **WHEN** the LLM invokes `get_events_availability` with a date range
- **THEN** only time slots (start, end, all-day flag) are returned
- **AND** no titles or details are included

#### Scenario: Event creation records UID

- **WHEN** the LLM invokes `create_event` and the user approves
- **THEN** the event is created via CalDAV
- **AND** the event UID is recorded in the `calendar_uids` D1 table

#### Scenario: Event deletion cleans up UID

- **WHEN** the LLM invokes `delete_event` for an AI-created event and the user approves
- **THEN** the event is deleted via CalDAV
- **AND** the corresponding UID is removed from the `calendar_uids` D1 table

#### Scenario: Event mutation requires approval

- **WHEN** the LLM invokes `create_event`, `update_event`, or `delete_event`
- **THEN** the approval flow is triggered before execution

### Requirement: Calendar — Two-Axis Read Permission

The risk level of `get_events_details` SHALL be determined dynamically by two axes:

**Axis 1 — Information Granularity:**
`get_events_availability` SHALL return only time slots with no titles or details, so that availability checks ("Am I free Wednesday?") can always be answered instantly without approval.

**Axis 2 — Event Origin:**
The system SHALL record the UID (CalDAV event identifier) of every event it creates in D1. When `get_events_details` is called:

- If the event's UID exists in D1 (created by the assistant): the event details are returned immediately (low risk).
- If the event's UID is not in D1 (created by the user directly): the event is excluded from the immediate response and a summary indicating approval is needed is returned instead.

#### Scenario: AI-created event accessed without approval

- **WHEN** `get_events_details` is called for an event whose UID exists in D1
- **THEN** the event details are returned immediately without approval

#### Scenario: User-created event requires approval

- **WHEN** `get_events_details` is called and some events have UIDs not in D1
- **THEN** those events are excluded from the immediate response
- **AND** a message is returned indicating that N user-created events require approval to view