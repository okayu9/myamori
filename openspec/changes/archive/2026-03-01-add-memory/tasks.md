## 1. Schema & Migration

- [x] 1.1 Add `memories` table to `src/db/schema.ts` with columns: id (text PK), chatId (text), summary (text), createdAt (text), and index on chatId
- [x] 1.2 Generate D1 migration with `bunx drizzle-kit generate`

## 2. Memory Module

- [x] 2.1 Create `src/memory/embedder.ts` with `embedText(ai, text)` function that calls Workers AI `@cf/baai/bge-m3` and returns a 1024-dimensional vector
- [x] 2.2 Create `src/memory/store.ts` with `storeMemory(vectorize, db, { chatId, summary, vector })` that inserts into Vectorize and D1
- [x] 2.3 Create `src/memory/retriever.ts` with `retrieveMemories(vectorize, ai, { chatId, query, topK?, threshold? })` that embeds the query, searches Vectorize filtered by chatId, and returns matching memory summaries from D1
- [x] 2.4 Create `src/memory/summarizer.ts` with `summarizeTurn(anthropic, model, userMessage, assistantResponse)` that calls the LLM to produce a concise summary (maxOutputTokens: 150)

## 3. System Prompt Integration

- [x] 3.1 Update `buildSystemPrompt` in `src/agent/prompt.ts` to accept an optional `memories` parameter and render a "Relevant Memories" section when memories are present

## 4. Workflow Integration

- [x] 4.1 Add `VECTORIZE` (VectorizeIndex) and `AI` (Ai) bindings to `AgentWorkflowEnv` in `src/agent/workflow.ts`
- [x] 4.2 Add `retrieve-memories` step after `load-history` in `AgentWorkflow.run()`: embed user message, query Vectorize, filter by threshold (≥ 0.7), pass results to `call-llm` step. Non-fatal on failure.
- [x] 4.3 Pass retrieved memories to `buildSystemPrompt` in the `call-llm` step
- [x] 4.4 Add `memorize` step after `save-history`: skip if response < 50 chars, summarize the turn, embed, store in Vectorize and D1. Non-fatal on failure.

## 5. Bindings Configuration

- [x] 5.1 Add `VECTORIZE` and `AI` bindings to `wrangler.toml`
- [x] 5.2 Add `VECTORIZE` and `AI` to the `Bindings` type in `src/index.ts` and pass to workflow env

## 6. Tests

- [x] 6.1 Add unit tests for `embedText` in `test/unit/memory/embedder.test.ts` (mock Workers AI binding)
- [x] 6.2 Add unit tests for `storeMemory` in `test/unit/memory/store.test.ts` (mock Vectorize, use D1 from test env)
- [x] 6.3 Add unit tests for `retrieveMemories` in `test/unit/memory/retriever.test.ts` (mock Vectorize and Workers AI)
- [x] 6.4 Add unit tests for `summarizeTurn` in `test/unit/memory/summarizer.test.ts` (dependency injection for LLM call)
- [x] 6.5 Add unit test for `buildSystemPrompt` with memories parameter in `test/unit/agent/prompt.test.ts`

## 7. Lint & Type Check

- [x] 7.1 Run `bunx biome check --write` and `bunx tsc --noEmit` to verify all changes pass lint and type check
