## Why

The agent loop currently only returns text responses. To interact with external services (email, files, calendar, web search), the agent needs a tool execution framework. This is the foundation that all concrete tools build on.

## What Changes

- Add `Tool` interface with Zod input/output schemas, risk level, and execute function
- Add tool registry for registering and looking up tools by name
- Add `ToolExecutor` that validates input via Zod, routes by risk level, and executes
- Integrate tool execution into the agent Workflow: replace single `generateText` with an agentic loop that handles tool calls up to the Tool Call Limit (default: 5)
- Update system prompt to include registered tool descriptions
- Implement low-risk and medium-risk execution paths (high-risk returns an error message; approval flow is a separate change)

## Capabilities

### New Capabilities

_None — the tool framework is part of the existing `tools` and `agent` specs._

### Modified Capabilities

- `tools`: Implementing Tool Definition and Risk Levels requirements (framework only; no concrete tools like email/files/calendar)
- `agent`: Implementing Tool Call Limit requirement, and updating Message Processing Flow to handle tool calls in the agentic loop

## Impact

- `src/agent/workflow.ts`: replace single `generateText` with agentic tool-call loop
- `src/agent/prompt.ts`: include tool descriptions in system prompt
- `src/tools/`: new module (Tool interface, registry, executor)
- `vitest.config.ts`: no new bindings needed
- Dependencies: none (Vercel AI SDK already supports tool calls)
