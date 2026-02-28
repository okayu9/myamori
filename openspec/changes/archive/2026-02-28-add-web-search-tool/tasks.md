## 1. Tool Implementation

- [x] 1.1 Create `src/tools/web-search.ts` with `createWebSearchTool(apiKey)` factory using `defineTool`
- [x] 1.2 Implement Tavily API call with `fetch()`, `AbortSignal.timeout(10_000)`, and structured result parsing

## 2. Workflow Integration

- [x] 2.1 Register `web_search` tool in `src/agent/workflow.ts` using `createWebSearchTool(this.env.TAVILY_API_KEY)`
- [x] 2.2 Add `TAVILY_API_KEY` to env type definitions and wrangler config

## 3. Tests

- [x] 3.1 Create `test/unit/tools/web-search.test.ts` with unit tests (input validation, result structure, timeout, error handling)

## 4. Verification
- [x] 4.1 Run `bunx vitest run` and confirm all tests pass
- [x] 4.2 Run `bunx biome check` and confirm no lint/format issues
- [x] 4.3 Run `bunx tsc --noEmit` and confirm no type errors