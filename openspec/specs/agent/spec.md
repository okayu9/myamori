# Agent Specification

## Purpose

The agent core that orchestrates message processing, LLM invocation, tool execution, conversation history, and memory management.
## Requirements
### Requirement: Message Processing Flow

The agent SHALL process each incoming message through the following steps in order:

1. Verify the user is in the allowlist (in the webhook handler, before dispatching).
2. Dispatch a Cloudflare Workflow instance for the message.
3. In the Workflow, retrieve recent conversation history from D1.
4. Build the system prompt and call the LLM via Vercel AI SDK.
5. If the LLM returns a text response, send it to the user via Telegram.
6. Save the user message and assistant response to D1.

Tool calls, approval flow, audit logging, and long-term memory retrieval are deferred to separate changes.

#### Scenario: Text response from LLM

- **WHEN** an allowlisted user sends a text message
- **AND** the LLM returns a text response without tool calls
- **THEN** the agent sends the text response to the user via Telegram
- **AND** saves both the user message and assistant response to D1

#### Scenario: Non-allowlisted user

- **WHEN** a user not in the allowlist sends a message
- **THEN** the webhook handler returns 200 OK without dispatching a Workflow
- **AND** no reply is sent to the user

#### Scenario: LLM call fails

- **WHEN** the LLM call throws an error or times out
- **THEN** the agent sends an error message to the user via Telegram
- **AND** the user message is still saved to D1

#### Scenario: Workflow execution

- **WHEN** the webhook handler receives a valid message from an allowlisted user
- **THEN** the handler dispatches a Cloudflare Workflow instance and returns 200 OK immediately
- **AND** the Workflow executes the agent steps asynchronously with per-step retry and timeout

### Requirement: Tool Call Limit

The agent SHALL enforce a maximum number of tool call steps per conversation turn (default: 5) to prevent the LLM from chaining tool calls indefinitely.

#### Scenario: Tool call limit reached

- **WHEN** the LLM chains 5 tool calls in a single conversation turn
- **AND** requests a 6th tool call
- **THEN** the agent stops processing tool calls
- **AND** returns the accumulated results to the user

### Requirement: LLM Abstraction

The agent SHALL use the Vercel AI SDK (`ai` package) with the `@ai-sdk/anthropic` provider for LLM invocation.

The model ID SHALL be configurable via the `ANTHROPIC_MODEL` environment variable, defaulting to `claude-haiku-4-5`.

#### Scenario: LLM invocation uses Vercel AI SDK

- **WHEN** the agent invokes the LLM
- **THEN** it uses `generateText` from the Vercel AI SDK with the Anthropic provider
- **AND** no provider-specific code is called directly outside the provider configuration

#### Scenario: Model is configurable

- **WHEN** the `ANTHROPIC_MODEL` environment variable is set
- **THEN** the agent uses the specified model ID for LLM calls

#### Scenario: Default model

- **WHEN** the `ANTHROPIC_MODEL` environment variable is not set
- **THEN** the agent uses `claude-haiku-4-5` as the model

### Requirement: System Prompt

The system prompt SHALL be constructed dynamically and include: the assistant's role and personality, a placeholder for available tool descriptions, and the current date and time in ISO 8601 format.

#### Scenario: Dynamic system prompt construction

- **WHEN** the agent prepares an LLM invocation
- **THEN** the system prompt includes the assistant's role, a tools placeholder section, and the current date/time

#### Scenario: Tools placeholder

- **WHEN** the agent constructs the system prompt
- **AND** no tools are registered
- **THEN** the tools section indicates no tools are currently available

### Requirement: Short-Term Memory

The system SHALL store conversation history in a D1 `messages` table with columns: `id` (nanoid, primary key), `chat_id`, `role` (`user` or `assistant`), `content`, and `created_at` (ISO 8601).

The system SHALL include the most recent 20 messages for the chat in the LLM context for each invocation.

#### Scenario: Recent messages included in context

- **WHEN** the agent prepares an LLM invocation
- **AND** there are more than 20 messages in the conversation
- **THEN** only the most recent 20 messages are included in the LLM context

#### Scenario: Messages saved after response

- **WHEN** the agent completes a conversation turn
- **THEN** both the user message and assistant response are saved to the `messages` table
- **AND** each message has a unique nanoid, the chat ID, the appropriate role, and an ISO 8601 timestamp

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

