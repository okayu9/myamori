## 1. Database Schema and Drizzle Setup

- [x] 1.1 Create `src/db/schema.ts` with `messages` table definition (id, chat_id, role, content, created_at) and composite index
- [x] 1.2 Create `src/db/index.ts` with `createDb(d1)` helper that returns a Drizzle instance
- [x] 1.3 Create `drizzle.config.ts` at project root for D1 dialect
- [x] 1.4 Generate initial migration with `bunx drizzle-kit generate` and verify the SQL output
- [x] 1.5 Add D1 binding (`[[d1_databases]]`) to `wrangler.toml`

## 2. Agent Module

- [x] 2.1 Create `src/agent/history.ts` with `loadHistory(db, chatId)` — query last 20 messages ordered by created_at — and `saveMessages(db, chatId, userContent, assistantContent)`
- [x] 2.2 Create `src/agent/prompt.ts` with `buildSystemPrompt()` — returns role, date/time (ISO 8601), tools placeholder
- [x] 2.3 Create `src/agent/workflow.ts` with `AgentWorkflow` extending `WorkflowEntrypoint` — steps: load-history, call-llm (retry 3, timeout 5min), send-reply, save-history

## 3. Webhook Handler Integration

- [x] 3.1 Add `ALLOWED_USER_IDS`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, and `AGENT_WORKFLOW` to the `Bindings` type in `src/index.ts`
- [x] 3.2 Add allowlist check after `parseMessage` — silently return `{ ok: true }` if user not in list
- [x] 3.3 Replace `waitUntil(sendReply(...))` with Workflow dispatch (`env.AGENT_WORKFLOW.create(...)`) and return 200 immediately
- [x] 3.4 Export `AgentWorkflow` class from `src/index.ts` for the Workflow binding
- [x] 3.5 Add Workflow binding (`[[workflows]]`) to `wrangler.toml`

## 4. Configuration

- [x] 4.1 Add `ANTHROPIC_API_KEY` and `ALLOWED_USER_IDS` to `wrangler.toml` as secret comments
- [x] 4.2 Add test bindings to `vitest.config.ts`: D1 database, `ALLOWED_USER_IDS`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`

## 5. Install Dependencies

- [x] 5.1 Install `nanoid` for message ID generation

## 6. Tests

- [x] 6.1 Create `test/unit/agent/history.test.ts` — test loadHistory (empty, under 20, over 20 messages) and saveMessages
- [x] 6.2 Create `test/unit/agent/prompt.test.ts` — test buildSystemPrompt includes role, date/time, and tools placeholder
- [x] 6.3 Create `test/unit/db/schema.test.ts` — verify table and column definitions

## 7. Verification

- [x] 7.1 Run `bunx vitest run` and verify all tests pass
- [x] 7.2 Run `bunx biome check .` and fix any issues
- [x] 7.3 Run `bunx tsc --noEmit` and fix any type errors