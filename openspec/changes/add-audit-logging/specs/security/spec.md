## MODIFIED Requirements

### Requirement: Audit Logging

All LLM calls (model name, token usage, duration) and all tool executions (tool name, result status, duration) SHALL be recorded in D1 via a single `audit_logs` table.

Each audit entry SHALL include a `type` discriminator (`llm_call` or `tool_execution`), a `chatId` for conversation correlation, and a JSON `metadata` column for type-specific data.

Input values SHALL be stored as truncated summaries (first 200 characters of serialized input) to avoid accumulating sensitive data.

Audit log writes SHALL NOT block or fail the agent flow. Logging failures SHALL be caught and silently ignored.

#### Scenario: LLM call logged

- **WHEN** the agent invokes the LLM
- **THEN** a D1 record is created with type `llm_call`, model name, prompt token count, completion token count, and call duration in milliseconds

#### Scenario: Tool execution logged

- **WHEN** a tool is executed (either directly or via approval callback)
- **THEN** a D1 record is created with type `tool_execution`, tool name, result status (`success` or `error`), and truncated input summary
- **AND** input values are stored as the first 200 characters of the serialized input

#### Scenario: Logging failure does not break agent

- **WHEN** an audit log write fails (e.g., D1 unavailable)
- **THEN** the agent continues processing normally
- **AND** the error is logged to console
