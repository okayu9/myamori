## MODIFIED Requirements

### Requirement: Risk Levels

The system SHALL classify tools into three risk levels:

- **`low`**: Execute immediately. The tool runs and returns its result to the LLM.
- **`medium`**: Execute immediately. The system prompt instructs the LLM to report the action in its reply.
- **`high`**: Request approval. The tool saves a pending approval to D1, sends an inline keyboard to Telegram, and returns a message to the LLM indicating approval has been requested.

#### Scenario: Low-risk tool executed immediately

- **WHEN** a tool with risk level `low` is invoked by the LLM
- **THEN** it executes immediately and returns the result

#### Scenario: Medium-risk tool executed and reported

- **WHEN** a tool with risk level `medium` is invoked by the LLM
- **THEN** it executes immediately and returns the result
- **AND** the LLM is instructed via system prompt to report the action in its reply

#### Scenario: High-risk tool requests approval

- **WHEN** a tool with risk level `high` is invoked by the LLM
- **THEN** the pending operation is saved to D1
- **AND** an inline keyboard message is sent to Telegram
- **AND** the tool returns a message to the LLM indicating approval has been requested