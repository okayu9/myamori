## Why

The tool framework is in place but no concrete tools are registered yet. Web search is the simplest tool to implement — it's low-risk only, requires no D1/R2 storage, and provides immediate end-to-end validation that the agentic loop works with real tool calls.

## What Changes

- Implement `web_search` tool using Tavily Search API
- Register it in the agent workflow's `ToolRegistry`
- Add `TAVILY_API_KEY` secret to Worker bindings
- Return search result snippets (title, URL, snippet) — no full-page browsing

## Capabilities

### New Capabilities

_None — web search is already defined in the `tools` spec._

### Modified Capabilities

- `tools`: Implementing the Web Search requirement (search API integration, low-risk execution, snippet-only results)

## Impact

- `src/tools/web-search.ts`: new tool implementation using Tavily API
- `src/agent/workflow.ts`: register `web_search` tool in the registry
- `wrangler.toml.template`: add `TAVILY_API_KEY` secret comment
- `vitest.config.ts`: add `TAVILY_API_KEY` test binding
- `test/env.d.ts`: add `TAVILY_API_KEY` to `ProvidedEnv`
- Dependencies: none (Tavily is a simple REST API, no SDK needed)
