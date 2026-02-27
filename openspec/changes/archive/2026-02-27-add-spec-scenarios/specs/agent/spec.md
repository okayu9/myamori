## MODIFIED Requirements

### Requirement: Message Processing Flow

The agent SHALL process each incoming message through the following steps in order:

1. Verify the user is in the allowlist.
2. Retrieve recent conversation history from D1 and relevant long-term memories from Vectorize.
3. Send system prompt, context, and tool definitions to the LLM.
4. If the LLM returns a text response, send it to the user.
5. If the LLM requests a tool call, route it to the Tool Executor:
   - `low` risk: execute immediately, feed the result back to the LLM to continue the conversation.
   - `high` risk: send an approval request; on approval execute and return the result, on rejection or timeout cancel.
6. Save the conversation history to D1.
7. Write an audit log entry to D1.

#### Scenario: Text response from LLM

- **WHEN** an allowlisted user sends a message
- **AND** the LLM returns a text response without tool calls
- **THEN** the agent sends the text response to the user
- **AND** saves the conversation to D1
- **AND** writes an audit log entry

#### Scenario: Low-risk tool call

- **WHEN** the LLM requests a tool call with risk level `low`
- **THEN** the agent executes the tool immediately
- **AND** feeds the result back to the LLM

#### Scenario: High-risk tool call approved

- **WHEN** the LLM requests a tool call with risk level `high`
- **THEN** the agent sends an approval request to the user
- **AND** on approval, executes the tool and returns the result

#### Scenario: Non-allowlisted user

- **WHEN** a user not in the allowlist sends a message
- **THEN** the agent does not process the message

### Requirement: Tool Call Limit

The agent SHALL enforce a maximum number of tool call steps per conversation turn (default: 5) to prevent the LLM from chaining tool calls indefinitely.

#### Scenario: Tool call limit reached

- **WHEN** the LLM chains 5 tool calls in a single conversation turn
- **AND** requests a 6th tool call
- **THEN** the agent stops processing tool calls
- **AND** returns the accumulated results to the user

### Requirement: LLM Abstraction

The agent SHALL use the Vercel AI SDK (`ai` package) for a unified LLM interface, allowing provider/model swaps without changing application code.

The specific LLM provider and model SHALL be decided at implementation time.

#### Scenario: LLM invocation uses Vercel AI SDK

- **WHEN** the agent invokes the LLM
- **THEN** it uses the Vercel AI SDK interface
- **AND** no provider-specific code is called directly

### Requirement: System Prompt

The system prompt SHALL be constructed dynamically and include: the assistant's role and personality, available tool descriptions, current date and time, and any relevant context from memory.

#### Scenario: Dynamic system prompt construction

- **WHEN** the agent prepares an LLM invocation
- **THEN** the system prompt includes the assistant's role, tool descriptions, current date/time, and memory context

### Requirement: Short-Term Memory

The system SHALL store conversation history in D1.

The system SHALL include the most recent N messages (default: 20) in the LLM context for each invocation.

#### Scenario: Recent messages included in context

- **WHEN** the agent prepares an LLM invocation
- **AND** there are more than 20 messages in the conversation
- **THEN** only the most recent 20 messages are included in the LLM context

### Requirement: Long-Term Memory

When conversation history exceeds a threshold, older messages SHALL be summarized by the LLM.

The summary SHALL be embedded using Workers AI and stored in Vectorize.

On each new message, the system SHALL perform a vector search to retrieve relevant past memories and include them in the LLM context.

Long-term memory is a Phase 3 feature.

#### Scenario: Memory summarization triggered

- **WHEN** conversation history exceeds the threshold
- **THEN** the system summarizes older messages via the LLM
- **AND** stores the embedding in Vectorize

#### Scenario: Relevant memories retrieved

- **WHEN** a new message is received
- **THEN** the system performs a vector search in Vectorize
- **AND** includes relevant past memories in the LLM context
