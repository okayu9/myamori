# memory Specification

## Purpose
TBD - created by archiving change add-memory. Update Purpose after archive.
## Requirements
### Requirement: Memory Storage

The system SHALL store each memory as a vector in Cloudflare Vectorize and metadata in a D1 `memories` table.

Each memory record SHALL contain: a unique ID (shared between Vectorize and D1), the chat ID, a text summary, and a creation timestamp.

The Vectorize vector SHALL be generated using Workers AI `@cf/baai/bge-m3` (1024 dimensions, cosine metric).

#### Scenario: Memory created after conversation turn

- **WHEN** a conversation turn completes with a substantive assistant response (≥ 50 characters)
- **THEN** the system summarizes the turn via the LLM
- **AND** generates a 1024-dimensional embedding of the summary via Workers AI
- **AND** inserts the vector into Vectorize with `chatId` and `createdAt` metadata
- **AND** inserts a row into the D1 `memories` table with the same ID, chat ID, summary, and timestamp

#### Scenario: Trivial response skipped

- **WHEN** a conversation turn completes with an assistant response shorter than 50 characters
- **THEN** the system does NOT create a memory for that turn

#### Scenario: Memorization failure is non-fatal

- **WHEN** memory creation fails (LLM error, Vectorize error, or D1 error)
- **THEN** the error is logged
- **AND** the conversation continues normally without blocking the user

### Requirement: Memory Retrieval

The system SHALL retrieve relevant memories before each LLM invocation by embedding the user's message and querying Vectorize.

#### Scenario: Relevant memories found

- **WHEN** a new user message is received
- **THEN** the system generates an embedding of the user message via Workers AI
- **AND** queries Vectorize with `topK: 5` filtered by the current chat ID
- **AND** includes only results with similarity score ≥ 0.7 in the LLM context

#### Scenario: No relevant memories

- **WHEN** a new user message is received
- **AND** no Vectorize results meet the similarity threshold
- **THEN** the LLM is invoked without any memory context

#### Scenario: Retrieval failure is non-fatal

- **WHEN** memory retrieval fails (embedding error or Vectorize query error)
- **THEN** the error is logged
- **AND** the LLM is invoked without memory context

### Requirement: Memory Summarization

The system SHALL use the LLM to summarize each conversation turn into a concise memory before embedding.

The summarization prompt SHALL instruct the LLM to produce a single-paragraph summary capturing the key facts, decisions, and context from the exchange.

The summarization call SHALL use `maxOutputTokens: 150` to keep summaries concise.

#### Scenario: Conversation turn summarized

- **WHEN** the system creates a memory for a conversation turn
- **THEN** it sends the user message and assistant response to the LLM with a summarization prompt
- **AND** uses the resulting summary text for embedding and storage

### Requirement: Chat Isolation

Each chat SHALL have its own memory namespace. Memories from one chat SHALL NOT appear in retrieval results for a different chat.

#### Scenario: Memories scoped to chat

- **WHEN** the system retrieves memories for chat A
- **THEN** only memories with `chatId` matching chat A are returned
- **AND** memories from chat B are excluded

