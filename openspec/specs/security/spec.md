# Security Specification

## Purpose

Defines authentication, authorization, approval flow, audit logging, rate limiting, and credential management for the personal AI assistant.
## Requirements
### Requirement: Credential Management

All API keys, OAuth tokens, and passwords SHALL be stored via `wrangler secret put` in Cloudflare Secrets.

Secrets SHALL be encrypted and only exposed to the Worker runtime. They SHALL NOT appear in the dashboard, logs, or OpenTofu state.

#### Scenario: Secret stored securely

- **WHEN** a secret is set via `wrangler secret put`
- **THEN** it is encrypted and accessible only within the Worker runtime
- **AND** it does not appear in the Cloudflare dashboard, logs, or OpenTofu state

### Requirement: Apple Calendar Credentials

Authentication with iCloud CalDAV SHALL use an Apple ID and an app-specific password (16 characters).

Because app-specific passwords are static credentials (valid until explicitly revoked), periodic rotation SHOULD be performed (e.g., every 6 months: regenerate in Apple ID settings, update with `wrangler secret put`).

#### Scenario: CalDAV authentication

- **WHEN** the system connects to iCloud CalDAV
- **THEN** it authenticates using the Apple ID and app-specific password from Cloudflare Secrets

### Requirement: Authentication

The system SHALL authenticate users via a Telegram User ID allowlist.

Messages from non-allowlisted users SHALL be silently ignored.

#### Scenario: Allowlisted user authenticated

- **WHEN** a message arrives from a user whose Telegram ID is in the allowlist
- **THEN** the message is processed normally

#### Scenario: Non-allowlisted user rejected

- **WHEN** a message arrives from a user whose Telegram ID is not in the allowlist
- **THEN** the message is silently ignored

### Requirement: Approval Flow

The approval flow SHALL be triggered when a tool with risk level `high` is invoked.

The system SHALL:

1. Save the pending operation to D1 with a timeout of 10 minutes.
2. Send a preview of the operation to Telegram with an inline keyboard (Approve/Reject buttons).
3. On **Approve**: execute the tool and send the result directly to Telegram.
4. On **Reject**: cancel the operation and notify the user via Telegram.
5. On **timeout** (10 minutes elapsed): mark as expired. If the user later clicks a button, respond that the approval has expired.

The tool SHALL return a message to the LLM indicating that approval has been requested, so the LLM can inform the user in its reply.

Approved tool results SHALL be sent directly to Telegram, not routed back through the LLM.

#### Scenario: Approval granted

- **WHEN** a high-risk tool is invoked
- **AND** the user clicks Approve within 10 minutes
- **THEN** the tool is executed
- **AND** the result is sent directly to Telegram

#### Scenario: Approval rejected

- **WHEN** a high-risk tool is invoked
- **AND** the user clicks Reject
- **THEN** the operation is cancelled
- **AND** the user is notified via Telegram

#### Scenario: Approval timeout

- **WHEN** a high-risk tool is invoked
- **AND** the user does not respond within 10 minutes
- **THEN** the approval is marked as expired
- **AND** if the user later clicks a button, they are informed that the approval has expired

#### Scenario: LLM informed of pending approval

- **WHEN** a high-risk tool is invoked
- **THEN** the tool returns a message to the LLM indicating approval has been requested
- **AND** the LLM can inform the user in its reply

#### Scenario: Double-click prevention

- **WHEN** the user clicks Approve or Reject on an already-resolved approval
- **THEN** the system responds that the approval has already been resolved
- **AND** no duplicate execution occurs

### Requirement: Approval-Required Operations

The following operations SHALL require approval:

- `get_events_details` (for user-created events only, determined by UID tracking).
- `create_event`.
- `update_event`.
- `delete_event`.
- `delete_file`.

#### Scenario: Calendar mutation requires approval

- **WHEN** the LLM invokes `create_event`, `update_event`, or `delete_event`
- **THEN** the approval flow is triggered before execution

#### Scenario: File deletion requires approval

- **WHEN** the LLM invokes `delete_file`
- **THEN** the approval flow is triggered before execution

### Requirement: Audit Logging

All LLM calls (model name, token usage) and all tool executions (tool name, result status) SHALL be recorded in D1.

Input values SHALL be stored as summaries only to avoid accumulating sensitive data.

#### Scenario: LLM call logged

- **WHEN** the agent invokes the LLM
- **THEN** a D1 record is created with model name and token usage

#### Scenario: Tool execution logged

- **WHEN** a tool is executed
- **THEN** a D1 record is created with tool name and result status
- **AND** input values are stored as summaries only

### Requirement: Rate Limiting

The system SHALL implement KV-based rate limiting per user, covering:

- Messages per time window.
- LLM invocations per time window.

The primary purpose SHALL be cost runaway prevention.

#### Scenario: Rate limit exceeded

- **WHEN** a user exceeds the message rate limit within a time window
- **THEN** subsequent messages are rejected until the window resets

### Requirement: Network Boundaries

The Worker code SHALL only communicate with explicitly fetched endpoints.

External connections SHALL be limited to: LLM API, Telegram Bot API, iCloud CalDAV, and web search API.

#### Scenario: Unauthorized outbound request blocked

- **WHEN** application code attempts to fetch a URL not in the approved list
- **THEN** the request is not made

