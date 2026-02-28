## Context

The agent loop processes text messages end-to-end (allowlist → history → LLM → reply → save). The next step is enabling the LLM to call tools. The Vercel AI SDK already supports tool calls via `generateText` with `maxSteps`, so the framework builds on top of that.

This change implements the tool framework only. No concrete tools (email, files, calendar) are registered yet. High-risk approval flow is deferred.

## Goals / Non-Goals

**Goals:**

- Define a `ToolDefinition` interface with Zod schemas and risk levels
- Create a tool registry to register/lookup tools
- Integrate tools into the agent Workflow using Vercel AI SDK's `maxSteps` for agentic looping
- Enforce Tool Call Limit (default: 5 steps)
- Handle risk levels: `low` executes immediately, `medium` executes and flags for reporting, `high` returns an error (approval flow deferred)
- Update system prompt to include tool descriptions dynamically

**Non-Goals:**

- Concrete tool implementations (email, files, calendar, web search)
- High-risk approval flow (Workflows `waitForApproval` in a separate change)
- Audit logging of tool executions (separate change)

## Decisions

### 1. Leverage Vercel AI SDK's native tool support

Use the AI SDK's `tool()` helper and `maxSteps` parameter instead of building a custom agentic loop. The SDK handles:
- Tool call parsing from LLM response
- Feeding tool results back to the LLM
- Multi-step looping until text response or step limit

```ts
const result = await generateText({
  model: anthropic(model),
  system: buildSystemPrompt(tools),
  messages: history,
  tools: convertToAISDKTools(registry),
  maxSteps: 5,
});
```

**Why not a custom loop:** The AI SDK's loop handles parallel tool calls, message format conversion, and provider-specific serialization. Reimplementing this adds complexity with no benefit.

### 2. Tool Definition interface

Each tool is defined with:

```ts
interface ToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  riskLevel: "low" | "medium" | "high";
  execute: (input: TInput) => Promise<TOutput>;
}
```

No output schema validation at this stage — the AI SDK serializes tool results to JSON automatically. Output schemas can be added later for audit logging.

**Why no output schema:** Over-engineering for now. The LLM receives the raw return value as JSON. Validation adds cost with no current consumer.

### 3. Tool Registry

A simple `Map<string, ToolDefinition>` wrapped in a `ToolRegistry` class with `register()` and `getAll()` methods. The registry converts definitions to AI SDK `tool()` format for `generateText`.

```text
ToolRegistry
  register(def: ToolDefinition)  — add a tool
  getAll()                       — return all definitions
  toAISDKTools()                 — convert to AI SDK tools map with risk-level gating
```

### 4. Risk-level gating in tool execution

Instead of a separate `ToolExecutor`, risk gating is embedded in each tool's `execute` wrapper when converting to AI SDK format:

- **`low`**: Execute directly, return result
- **`medium`**: Execute directly, return result (reporting is handled by the LLM via system prompt instruction)
- **`high`**: Throw a descriptive error message — the LLM sees "This action requires approval which is not yet implemented" and can inform the user

This approach works because the AI SDK calls `execute` automatically during the loop. No separate executor needed.

**Why not a ToolExecutor class:** The AI SDK already orchestrates execution. Adding an executor layer would duplicate the call chain. Risk gating as a wrapper keeps it simple.

### 5. System prompt includes tool descriptions

`buildSystemPrompt()` takes an optional list of tool definitions and renders them in the "Available Tools" section:

```text
## Available Tools
- search_emails: Search emails by keyword (risk: low)
- delete_file: Delete a file from storage (risk: high, requires approval)
```

When no tools are registered, the section says "No tools are currently available." (existing behavior).

### 6. Module structure

```text
src/
  tools/
    types.ts        — ToolDefinition interface
    registry.ts     — ToolRegistry class
  agent/
    workflow.ts     — updated: agentic loop with tools
    prompt.ts       — updated: include tool descriptions
```

### 7. Workflow changes

The `call-llm` step changes from `generateText` (single call) to `generateText` with `tools` and `maxSteps: 5`. The step timeout (5 min) accommodates multiple LLM round-trips.

The step result changes from a plain string to the full `generateText` result, from which we extract `result.text` for the reply.

## Risks / Trade-offs

- **[maxSteps timeout]** Multiple tool calls within a single Workflow step could approach the 5-minute timeout. → Acceptable: even 5 sequential LLM calls at ~30s each fit within 5 minutes. If needed, timeout can be increased per step.
- **[No output validation]** Tool results are not validated against an output schema. → Acceptable for now; the LLM handles arbitrary JSON. Can be added when audit logging needs structured output.
- **[Medium-risk reporting via prompt]** Medium-risk tools rely on the system prompt instructing the LLM to mention the action in its reply, rather than a programmatic flag. → Acceptable: the LLM reliably follows system prompt instructions for reporting. A structured approach can be added later.
- **[High-risk error message]** High-risk tools throw an error that the LLM sees. The LLM may attempt to retry or work around it. → Mitigated: the error message is clear and the LLM should inform the user. The Tool Call Limit (5) prevents infinite retry loops.
