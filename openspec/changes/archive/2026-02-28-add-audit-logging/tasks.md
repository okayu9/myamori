## 1. Database Schema

- [x] 1.1 Add `auditLogs` table to `src/db/schema.ts` (id, type, chatId, metadata, createdAt)
- [x] 1.2 Generate Drizzle migration with `bunx drizzle-kit generate`

## 2. Audit Logger Module

- [x] 2.1 Create `src/audit/logger.ts` with `logLLMCall(db, params)` — records model name, token usage, duration, chatId
- [x] 2.2 Add `logToolExecution(db, params)` — records tool name, result status, truncated input summary, chatId
- [x] 2.3 Wrap both functions in try/catch so logging failures never throw

## 3. Integration

- [x] 3.1 Integrate `logLLMCall` in `AgentWorkflow` after `generateText` returns (using result.usage)
- [x] 3.2 Integrate `logToolExecution` in `ToolRegistry.createGatedExecute` to log after every tool call
- [x] 3.3 Integrate `logToolExecution` in callback query handler (`src/index.ts`) for approved tool executions

## 4. Tests

- [x] 4.1 Unit tests for `logLLMCall` (stores correct fields, truncates input, catches errors)
- [x] 4.2 Unit tests for `logToolExecution` (stores correct fields, truncates input, catches errors)
- [x] 4.3 Unit tests for registry integration (tool execution creates audit log entry)

## 5. Verification

- [x] 5.1 Run `bunx vitest run` and confirm all tests pass
- [x] 5.2 Run `bunx biome check` and confirm no lint/format issues
- [x] 5.3 Run `bunx tsc --noEmit` and confirm no type errors
