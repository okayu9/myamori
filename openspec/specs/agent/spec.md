# Agent Specification

## Purpose

The agent core that orchestrates message processing, LLM invocation, tool execution, conversation history, and memory management.
## Requirements
### Requirement: Message Processing Flow

The agent SHALL process each incoming message through the following steps in order:

1. Verify the user is in the allowlist (in the webhook handler, before dispatching).
2. Dispatch a Cloudflare Workflow instance for the message.
3. In the Workflow, retrieve recent conversation history from D1.
4. Retrieve relevant long-term memories from Vectorize by embedding the user message and querying with `topK: 5` filtered by chat ID.
5. Build the system prompt with tool descriptions, retrieved memories, and call the LLM via Vercel AI SDK with registered tools and `stopWhen: stepCountIs(5)` for agentic looping.
6. If the LLM returns a text response, send it to the user via Telegram.
7. If the LLM requests a tool call, the AI SDK executes it automatically and feeds the result back to the LLM (up to the Tool Call Limit).
8. Save the user message and assistant response to D1.
9. Summarize the conversation turn and store as a long-term memory in Vectorize and D1 (best-effort, non-fatal on failure).

#### Scenario: Text response from LLM

- **WHEN** an allowlisted user sends a text message
- **AND** the LLM returns a text response without tool calls
- **THEN** the agent sends the text response to the user via Telegram
- **AND** saves both the user message and assistant response to D1
- **AND** creates a long-term memory from the conversation turn (best-effort)

#### Scenario: Tool call from LLM

- **WHEN** the LLM requests a tool call during message processing
- **THEN** the AI SDK executes the tool via the risk-gated wrapper
- **AND** feeds the result back to the LLM for the next step
- **AND** continues until the LLM produces a text response or the step limit is reached

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

The agent SHALL enforce a maximum of 5 tool call steps per conversation turn via `stopWhen: stepCountIs(5)` in `generateText`.

When the limit is reached, the LLM's last response (text or partial) is sent to the user.

#### Scenario: Tool call limit reached

- **WHEN** the LLM chains tool calls reaching 5 steps
- **THEN** the agent stops processing further tool calls
- **AND** returns the LLM's last text response to the user

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

The system prompt SHALL be constructed dynamically and include: the assistant's role and personality, descriptions of all registered tools with their risk levels, retrieved long-term memories (if any), the current date and time in ISO 8601 format, and instructions for medium-risk tool reporting.

#### Scenario: Dynamic system prompt with tools

- **WHEN** the agent prepares an LLM invocation
- **AND** tools are registered in the registry
- **THEN** the system prompt includes each tool's name, description, and risk level

#### Scenario: System prompt with memories

- **WHEN** the agent prepares an LLM invocation
- **AND** relevant memories were retrieved from Vectorize
- **THEN** the system prompt includes a "Relevant Memories" section with the memory summaries

#### Scenario: System prompt without memories

- **WHEN** the agent prepares an LLM invocation
- **AND** no relevant memories were found or memory retrieval failed
- **THEN** the system prompt does not include a memories section

#### Scenario: Medium-risk reporting instruction

- **WHEN** the system prompt is constructed
- **AND** medium-risk tools are registered
- **THEN** the system prompt includes an instruction to report medium-risk tool actions in the reply

#### Scenario: No tools registered

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

