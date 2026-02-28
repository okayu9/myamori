## Context

The tool framework (`ToolDefinition`, `ToolRegistry`, `defineTool`) is in place, and the agent workflow creates an empty registry on each invocation. This change registers the first concrete tool: web search via Tavily API. The spec requires low-risk results with no full-page browsing.

## Goals / Non-Goals

**Goals:**

- Implement `web_search` tool using Tavily Search API
- Register it in the agent workflow so the LLM can call it
- Return structured search results (title, URL, snippet) plus an LLM-generated answer summary from Tavily
- Validate end-to-end agentic tool-call loop with a real tool

**Non-Goals:**

- Full-page content fetching/browsing
- Caching search results
- Rate limiting API calls (deferred to rate-limiting change)
- Audit logging of tool executions (separate change)

## Decisions

### 1. Tavily REST API directly (no SDK)

Call Tavily's `/search` endpoint via `fetch()` instead of using the `tavily` npm package.

**Why:** Tavily's API is a single POST endpoint. Adding an npm package for one HTTP call adds unnecessary dependency weight. `fetch()` is available natively in Workers.

```ts
const response = await fetch("https://api.tavily.com/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    api_key: apiKey,
    query,
    max_results: 5,
    include_answer: "advanced",
  }),
});
```

### 2. Tool module structure

Each tool lives in `src/tools/<name>.ts` and exports a factory function that accepts env/config and returns a `ToolDefinition`. This pattern allows tools to capture secrets (API keys) via closure.

```ts
// src/tools/web-search.ts
export function createWebSearchTool(apiKey: string): ToolDefinition
```

### 3. Tool registration in workflow

The workflow creates the registry and registers tools with env bindings. This keeps tool creation colocated with the env that provides secrets.

```ts
const registry = new ToolRegistry();
registry.register(createWebSearchTool(this.env.TAVILY_API_KEY));
```

### 4. Result format: snippets + answer

Return an object with two fields:
- `answer`: Tavily's LLM-generated answer summary (`include_answer: "advanced"` for detailed responses)
- `results`: array of `{ title, url, snippet }` objects (up to 5 results)

The answer gives the LLM a pre-synthesized response it can use directly or build upon. The snippets provide source citations. This avoids full-page browsing while delivering rich information.

### 5. Timeout on Tavily API call

Add `AbortSignal.timeout(10_000)` to the fetch call. If Tavily is slow, the tool fails fast rather than consuming the entire Workflow step timeout.

## Risks / Trade-offs

- **[Tavily API availability]** If Tavily is down, the tool throws an error and the LLM sees it. → Acceptable: the LLM can inform the user. The Workflow step has retries.
- **[API key in env]** `TAVILY_API_KEY` is passed through env bindings. → Same pattern as `ANTHROPIC_API_KEY`. Secrets are configured via `wrangler secret put`.
- **[No result caching]** Identical queries hit Tavily every time. → Acceptable for single-user usage. Caching can be added later if needed.