## MODIFIED Requirements

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
