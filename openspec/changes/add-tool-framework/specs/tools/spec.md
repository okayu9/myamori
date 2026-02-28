## MODIFIED Requirements

### Requirement: Tool Definition

Every tool SHALL be defined with a Zod schema for input validation, a description, and an explicit risk level.

The tool framework SHALL provide a `ToolRegistry` for registering tools and converting them to AI SDK format.

The registry SHALL convert tool definitions to Vercel AI SDK `tool()` format for use with `generateText`.

#### Scenario: Tool registered with schema and risk level

- **WHEN** a new tool is registered in the ToolRegistry
- **THEN** it has a name, description, Zod input schema, an explicit risk level, and an execute function

#### Scenario: Registry converts to AI SDK format

- **WHEN** the agent prepares an LLM invocation
- **THEN** the ToolRegistry converts all registered tools to the AI SDK `tool()` format
- **AND** each tool's execute function is wrapped with risk-level gating

### Requirement: Risk Levels

The system SHALL classify tools into three risk levels:

- **`low`**: Execute immediately. The tool runs and returns its result to the LLM.
- **`medium`**: Execute immediately. The system prompt instructs the LLM to report the action in its reply.
- **`high`**: Reject execution with an error message. The LLM receives a message indicating approval is required but not yet implemented.

#### Scenario: Low-risk tool executed immediately

- **WHEN** a tool with risk level `low` is invoked by the LLM
- **THEN** it executes immediately and returns the result

#### Scenario: Medium-risk tool executed and reported

- **WHEN** a tool with risk level `medium` is invoked by the LLM
- **THEN** it executes immediately and returns the result
- **AND** the LLM is instructed via system prompt to report the action in its reply

#### Scenario: High-risk tool rejected

- **WHEN** a tool with risk level `high` is invoked by the LLM
- **THEN** execution is rejected with an error message
- **AND** the LLM receives "This action requires approval which is not yet implemented"