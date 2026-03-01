## Why

The agent currently uses only short-term memory (last 20 messages). Important context from earlier conversations is lost, forcing the user to repeat information. Phase 3 of the roadmap specifies long-term memory using Cloudflare Vectorize and Workers AI to enable the agent to recall relevant past interactions.

## What Changes

- Add a `memories` table in D1 to store summarized memory chunks with metadata.
- Integrate Workers AI (`@cf/baai/bge-m3`) for multilingual embedding generation (Japanese + English).
- Integrate Cloudflare Vectorize for vector storage and similarity search.
- Add a `retrieve-memories` workflow step that queries Vectorize before the LLM call and injects relevant memories into the system prompt.
- Add a `memorize` workflow step that summarizes and embeds completed conversation turns when history exceeds a threshold.
- Extend `buildSystemPrompt` to accept and render retrieved memories.

## Capabilities

### New Capabilities

- `memory`: Long-term memory system using Vectorize for semantic search and Workers AI for embedding generation. Covers memory creation (summarize + embed), retrieval (vector search), and injection into LLM context.

### Modified Capabilities

- `agent`: The agent workflow gains two new steps (`retrieve-memories` before `call-llm`, `memorize` after `save-history`) and the system prompt includes a "Relevant Memories" section.

## Impact

- **Bindings**: New `VECTORIZE` (VectorizeIndex) and `AI` (Ai) bindings in `wrangler.jsonc` and `AgentWorkflowEnv`.
- **Schema**: New `memories` table in D1 + migration.
- **Workflow**: Two new steps in `AgentWorkflow.run()`.
- **System prompt**: `buildSystemPrompt` signature changes to accept memories.
- **Dependencies**: No new npm packages (Workers AI and Vectorize are Cloudflare built-ins).
- **Infrastructure**: Vectorize index must be created via `wrangler vectorize create` or OpenTofu.
