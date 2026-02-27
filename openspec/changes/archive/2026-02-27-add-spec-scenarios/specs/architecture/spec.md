## MODIFIED Requirements

### Requirement: Request Flow

The system SHALL receive all user interactions via Discord Interaction Webhooks routed to Cloudflare Workers.

The system SHALL process requests through a three-stage pipeline: Channel Adapter → Agent Core → Tool Executor.

#### Scenario: End-to-end request processing

- **WHEN** a user sends a Discord interaction
- **THEN** the request is received by the Cloudflare Worker
- **AND** processed through Channel Adapter, Agent Core, and Tool Executor in order

### Requirement: Channel Adapter

The Channel Adapter SHALL verify webhook signatures and normalize incoming messages into a common `IncomingMessage` format.

#### Scenario: Webhook signature verification

- **WHEN** a webhook request arrives at the Channel Adapter
- **THEN** the adapter verifies the request signature
- **AND** normalizes the payload into `IncomingMessage` format

### Requirement: Agent Core

The Agent Core SHALL assemble conversation context, invoke the LLM, and generate responses.

The Agent Core SHALL support tool calls by routing them to the Tool Executor.

#### Scenario: Agent processes message with tool call

- **WHEN** the Agent Core receives a normalized message
- **AND** the LLM responds with a tool call
- **THEN** the Agent Core routes the tool call to the Tool Executor
- **AND** returns the final response to the user

### Requirement: Tool Executor

The Tool Executor SHALL validate all tool inputs against Zod schemas before execution.

The Tool Executor SHALL evaluate the risk level of each tool call and enforce the appropriate execution policy (immediate, report, or approval).

#### Scenario: Tool input validation

- **WHEN** a tool call is received by the Tool Executor
- **AND** the input does not match the Zod schema
- **THEN** the Tool Executor rejects the call with a validation error

#### Scenario: Risk-based execution policy

- **WHEN** a tool call has risk level `low`
- **THEN** the Tool Executor executes it immediately
- **WHEN** a tool call has risk level `high`
- **THEN** the Tool Executor triggers the approval flow

### Requirement: Cross-Cutting Components

The system SHALL provide an Audit Logger that records all LLM calls and tool executions.

The system SHALL provide a Memory Manager for short-term (conversation history) and long-term memory.

The system SHALL provide an Approval Flow for high-risk operations.

#### Scenario: Audit logging of LLM call

- **WHEN** the Agent Core invokes the LLM
- **THEN** the Audit Logger records the call with model name and token usage

#### Scenario: Approval flow for high-risk tool

- **WHEN** a high-risk tool is invoked
- **THEN** the Approval Flow sends an approval request to the user

### Requirement: Cloudflare Service Usage

The system SHALL use the following Cloudflare services:

- **Workers**: Main API server, Discord webhook handler, agent loop, Cron Triggers.
- **D1**: Conversation history, audit logs, approval queue, cron job definitions, email metadata/summaries, calendar UID tracking.
- **R2**: User file storage, raw email data (body and attachments).
- **Queues**: Async tool execution and email processing (producer/consumer pattern).
- **Cron Triggers**: Dynamic cron polling (single fixed 5-minute interval cron only).
- **Email Workers**: Receive and parse forwarded emails; store metadata in D1, raw data in R2.
- **Vectorize**: Vector search for long-term memory (Phase 3).
- **Workers AI**: Embedding generation for long-term memory (Phase 3).
- **KV**: Session cache, rate limit counters.
- **Secrets**: API keys and credentials, managed via `wrangler secret put`.

#### Scenario: Structured data stored in D1

- **WHEN** conversation history, audit logs, or approval records are persisted
- **THEN** they are stored in D1

#### Scenario: Blob data stored in R2

- **WHEN** user files or raw email data are persisted
- **THEN** they are stored in R2

### Requirement: Deferred Services

The system SHALL NOT use the following services in Phase 1:

- **Durable Objects**: Consider if multi-user support is needed later.
- **Pages**: Consider if an admin UI is needed later.
- **Browser Rendering**: Consider if browsing capability is needed later.

#### Scenario: Deferred services not used

- **WHEN** the system is running in Phase 1
- **THEN** Durable Objects, Pages, and Browser Rendering are not used

### Requirement: External Services

The system SHALL connect to the following external services only:

- LLM API (provider abstracted via Vercel AI SDK).
- iCloud CalDAV (Apple Calendar).
- Web search API (e.g., Tavily).

#### Scenario: Only approved external connections

- **WHEN** the Worker makes an outbound HTTP request
- **THEN** the destination is one of: LLM API, iCloud CalDAV, or web search API

### Requirement: Storage Layout

The system SHALL store structured data (conversation history, audit logs, approval queue, cron definitions, email metadata/summaries, calendar UIDs) in D1.

The system SHALL store blob data (user files, raw email body and attachments) in R2.

The system SHALL store vector indices for long-term memory in Vectorize (Phase 3).

#### Scenario: Storage layer selection

- **WHEN** the system persists structured records
- **THEN** they are stored in D1
- **WHEN** the system persists binary or large text data
- **THEN** they are stored in R2
