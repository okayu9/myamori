## Context

The agent currently keeps only the last 20 messages in context (short-term memory in D1). All older conversation context is discarded. Phase 3 of the roadmap calls for long-term memory using Cloudflare Vectorize and Workers AI so the agent can recall relevant past interactions.

The current workflow in `AgentWorkflow.run()` has steps: `load-history` → `call-llm` → `send-reply` → `save-history`. Memory retrieval and creation need to be inserted into this flow.

## Goals / Non-Goals

**Goals:**

- Enable the agent to recall relevant past conversations via semantic search.
- Automatically summarize and embed conversation turns for future retrieval.
- Support Japanese and English content with a multilingual embedding model.
- Keep memory operations non-blocking to the main conversation flow (best-effort).

**Non-Goals:**

- User-facing memory management tools (view, delete, search memories). Deferred to a future change.
- Cross-chat memory sharing. Each chat maintains its own memory namespace.
- Real-time memory updates during multi-step tool calls. Memory is created after the conversation turn completes.

## Decisions

### 1. Embedding Model: `@cf/baai/bge-m3`

Use `@cf/baai/bge-m3` (1024 dimensions) for embedding generation via Workers AI.

**Rationale**: The user communicates in Japanese. `bge-m3` supports multilingual embeddings (100+ languages including Japanese) with good quality. The alternative `bge-base-en-v1.5` (768 dimensions) is English-only and would fail for Japanese conversations.

**Alternatives considered**:
- `@cf/baai/bge-base-en-v1.5`: Better benchmark scores for English, but no Japanese support.
- External embedding APIs (OpenAI, Cohere): Violates the Cloudflare-Native principle and adds latency.

### 2. Vectorize Index Configuration

- **Dimensions**: 1024 (matching `bge-m3` output)
- **Metric**: cosine similarity
- **Metadata**: `chatId`, `createdAt`, `summary` (first 100 chars for quick preview)

**Rationale**: Cosine similarity is standard for text embeddings. Metadata filtering on `chatId` provides per-chat isolation without needing separate indexes.

### 3. Memory Lifecycle

1. **After each conversation turn**: Check if the current exchange is worth memorizing (non-trivial content).
2. **Summarize**: Use the LLM to create a concise summary of the conversation turn.
3. **Embed**: Generate a vector embedding of the summary.
4. **Store**: Insert the vector into Vectorize and save metadata in D1 `memories` table.

**Rationale**: Summarizing before embedding produces better retrieval quality than embedding raw messages. The LLM can extract the key information.

### 4. Memory Retrieval Strategy

- **Query**: Embed the user's incoming message and search Vectorize with `topK: 5`.
- **Filter**: By `chatId` metadata to scope to the current chat.
- **Threshold**: Only include memories with similarity score ≥ 0.7.
- **Injection**: Add a `## Relevant Memories` section to the system prompt.

**Rationale**: Top-5 with a similarity threshold balances context quality with token budget. Injecting into the system prompt (rather than as user messages) keeps the conversation flow clean.

### 5. D1 `memories` Table

Track memory metadata in D1 alongside the vector in Vectorize:

| Column | Type | Purpose |
|--------|------|---------|
| id | text PK | Matches Vectorize vector ID |
| chatId | text | Chat isolation |
| summary | text | Human-readable summary |
| createdAt | text | ISO 8601 timestamp |

**Rationale**: D1 provides queryable metadata and a source of truth for memory content. Vectorize metadata is limited and not designed for complex queries.

### 6. Memorization Threshold

Only create memories for conversation turns where the assistant response is substantive (not error messages or very short replies). Use a simple heuristic: skip if the response is fewer than 50 characters.

**Rationale**: Avoids polluting the memory store with trivial interactions like greetings or error messages.

### 7. Workflow Integration

New steps in `AgentWorkflow.run()`:

```
load-history → retrieve-memories → call-llm → send-reply → save-history → memorize
```

- `retrieve-memories`: Embed the user message, query Vectorize, format results. Failures are non-fatal (proceed without memories).
- `memorize`: Summarize the turn, embed, store. Failures are non-fatal (log and continue).

**Rationale**: Both memory steps are best-effort. A failure in memory retrieval or storage should never block the conversation.

## Risks / Trade-offs

- **[Latency]** Adding embedding + Vectorize query before the LLM call increases response time by ~100-200ms. → Acceptable for a personal assistant. Can be parallelized with history loading in the future.
- **[Token cost]** Summarization requires an additional LLM call per turn. → Use `maxOutputTokens: 150` and Haiku to minimize cost. Skip trivial exchanges.
- **[Memory quality]** Automatic summarization may lose nuance. → Start simple, iterate based on real usage. The raw messages remain in D1 history.
- **[Vectorize limits]** Free tier: 5 indexes, 200K vectors per index. → Sufficient for single-user personal assistant for a long time.
- **[Workers AI limits]** Embedding calls are rate-limited at the Workers AI tier. → Single-user usage is well within limits.
