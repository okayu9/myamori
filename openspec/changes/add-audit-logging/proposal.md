## Why

Every LLM call and tool execution currently goes unrecorded. Audit logging is a Phase 1 requirement (security spec) needed for debugging, cost tracking, and accountability before adding more tools.

## What Changes

- Add D1 table for audit log entries (LLM calls and tool executions)
- Create audit logger module that records LLM invocations (model name, token usage) and tool executions (tool name, result status, input summary)
- Integrate audit logging into AgentWorkflow (after LLM call) and ToolRegistry (after tool execution)
- Input values stored as summaries only to avoid accumulating sensitive data

## Capabilities

### New Capabilities

_None — audit logging is already defined in the `security` and `architecture` specs._

### Modified Capabilities

- `security`: Implementing the Audit Logging requirement (D1 persistence, LLM call logging, tool execution logging)

## Impact

- `src/db/schema.ts`: new `auditLogs` table
- `src/audit/logger.ts`: new module for recording audit entries
- `src/agent/workflow.ts`: log LLM call after `generateText`
- `src/tools/registry.ts`: log tool execution in `createGatedExecute`
- `drizzle/migrations/`: new migration for `audit_logs` table
- Dependencies: none (uses existing D1)
