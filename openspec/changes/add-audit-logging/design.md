## Context

The security spec requires all LLM calls and tool executions to be recorded in D1. Currently nothing is logged — making it impossible to debug agent behavior, track token costs, or audit tool usage. The agent workflow (`src/agent/workflow.ts`) and tool registry (`src/tools/registry.ts`) are the two integration points.

## Goals / Non-Goals

**Goals:**

- Record every LLM call with model name, token usage, and duration
- Record every tool execution with tool name, result status (success/error), and input summary
- Keep the logger simple: a single D1 table, fire-and-forget writes
- Integrate without changing the tool execution or LLM call signatures

**Non-Goals:**

- Query UI or dashboard for audit logs (future work)
- Log retention / cleanup policies (future work)
- Logging approval flow events separately (already tracked in `pending_approvals` table)
- Real-time alerting on audit events

## Decisions

### 1. Single `audit_logs` table with `type` discriminator

Store both LLM calls and tool executions in one table with a `type` column (`llm_call` | `tool_execution`). A JSON `metadata` column holds type-specific data.

**Alternative considered:** Separate tables for LLM calls and tool executions. Rejected — adds schema complexity for minimal benefit at current scale.

### 2. Fire-and-forget logging (no await in critical path)

Audit log writes use `waitUntil` in the workflow context or are wrapped in try/catch to ensure logging failures never break the agent flow. Audit logging is observability, not business logic.

**Alternative considered:** Blocking writes that fail the request on error. Rejected — audit failures should not degrade user experience.

### 3. Input summary via truncation

Store the first 200 characters of `JSON.stringify(input)` as the input summary. This satisfies the spec requirement ("summaries only") without complex redaction logic.

**Alternative considered:** Field-level redaction based on schema annotations. Rejected — over-engineering for Phase 1; truncation is sufficient.

### 4. Integration via wrapper functions

- **LLM calls:** Log after `generateText` returns, using the result's `usage` object (promptTokens, completionTokens)
- **Tool executions:** Wrap `createGatedExecute` in the registry to log after every tool call (both low-risk direct executions and high-risk approval callbacks)

### 5. Chat ID as correlation key

Include `chatId` in every audit entry to correlate logs with conversations. This enables per-conversation audit trails.

## Risks / Trade-offs

- **D1 write volume** — Every LLM call and tool execution adds a row. At current single-user scale this is negligible. If volume grows, add batch inserts or move to Queues. → Mitigation: Monitor row count periodically.
- **Metadata schema drift** — The JSON `metadata` column is schemaless. → Mitigation: Define TypeScript types for metadata payloads; validate at write time.
- **Clock skew** — `new Date().toISOString()` depends on Worker runtime clock. → Mitigation: Acceptable for audit purposes; not used for ordering guarantees.
