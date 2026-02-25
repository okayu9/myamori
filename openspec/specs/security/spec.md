# Security Specification

## Purpose

Defines authentication, authorization, approval flow, audit logging, rate limiting, and credential management for the personal AI assistant.

## Requirements

### Requirement: Credential Management

All API keys, OAuth tokens, and passwords SHALL be stored via `wrangler secret put` in Cloudflare Secrets.

Secrets SHALL be encrypted and only exposed to the Worker runtime. They SHALL NOT appear in the dashboard, logs, or OpenTofu state.

### Requirement: Apple Calendar Credentials

Authentication with iCloud CalDAV SHALL use an Apple ID and an app-specific password (16 characters).

Because app-specific passwords are static credentials (valid until explicitly revoked), periodic rotation SHOULD be performed (e.g., every 6 months: regenerate in Apple ID settings, update with `wrangler secret put`).

### Requirement: Authentication

The system SHALL authenticate users via a Discord User ID allowlist.

Messages from non-allowlisted users SHALL be silently ignored.

### Requirement: Approval Flow

The approval flow SHALL be triggered when a tool with risk level `high` is invoked.

The system SHALL:

1. Save the pending operation to D1 with a timeout of 10 minutes.
2. Send a preview of the operation to Discord with Approve/Reject buttons.
3. On **Approve**: execute the tool and return the result.
4. On **Reject** or **timeout**: cancel and notify.

### Requirement: Approval-Required Operations

The following operations SHALL require approval:

- `get_events_details` (for user-created events only, determined by UID tracking).
- `create_event`.
- `update_event`.
- `delete_event`.
- `delete_file`.

### Requirement: Audit Logging

All LLM calls (model name, token usage) and all tool executions (tool name, result status) SHALL be recorded in D1.

Input values SHALL be stored as summaries only to avoid accumulating sensitive data.

### Requirement: Rate Limiting

The system SHALL implement KV-based rate limiting per user, covering:

- Messages per time window.
- LLM invocations per time window.

The primary purpose SHALL be cost runaway prevention.

### Requirement: Network Boundaries

The Worker code SHALL only communicate with explicitly fetched endpoints.

External connections SHALL be limited to: LLM API, iCloud CalDAV, and web search API.
