# Architecture Specification

## Purpose

Defines the overall system architecture, request flow, component structure, and Cloudflare service usage for the personal AI assistant.

## Requirements

### Requirement: Request Flow

The system SHALL receive all user interactions via Discord Interaction Webhooks routed to Cloudflare Workers.

The system SHALL process requests through a three-stage pipeline: Channel Adapter → Agent Core → Tool Executor.

### Requirement: Channel Adapter

The Channel Adapter SHALL verify webhook signatures and normalize incoming messages into a common `IncomingMessage` format.

### Requirement: Agent Core

The Agent Core SHALL assemble conversation context, invoke the LLM, and generate responses.

The Agent Core SHALL support tool calls by routing them to the Tool Executor.

### Requirement: Tool Executor

The Tool Executor SHALL validate all tool inputs against Zod schemas before execution.

The Tool Executor SHALL evaluate the risk level of each tool call and enforce the appropriate execution policy (immediate, report, or approval).

### Requirement: Cross-Cutting Components

The system SHALL provide an Audit Logger that records all LLM calls and tool executions.

The system SHALL provide a Memory Manager for short-term (conversation history) and long-term memory.

The system SHALL provide an Approval Flow for high-risk operations.

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

### Requirement: Deferred Services

The system SHALL NOT use the following services in Phase 1:

- **Durable Objects**: Consider if multi-user support is needed later.
- **Pages**: Consider if an admin UI is needed later.
- **Browser Rendering**: Consider if browsing capability is needed later.

### Requirement: External Services

The system SHALL connect to the following external services only:

- LLM API (provider abstracted via Vercel AI SDK).
- iCloud CalDAV (Apple Calendar).
- Web search API (e.g., Tavily).

### Requirement: Storage Layout

The system SHALL store structured data (conversation history, audit logs, approval queue, cron definitions, email metadata/summaries, calendar UIDs) in D1.

The system SHALL store blob data (user files, raw email body and attachments) in R2.

The system SHALL store vector indices for long-term memory in Vectorize (Phase 3).
