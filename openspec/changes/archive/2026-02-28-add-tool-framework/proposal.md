## Why

The agent loop currently only returns text responses. To interact with external services (email, files, calendar, web search), the agent needs a tool execution framework. This is the foundation that all concrete tools build on.

## What Changes

- Add `ToolDefinition` interface with Zod input schema, risk level, and execute function
- Add `ToolRegistry` for registering tools and converting them to AI SDK format with risk-level gating
- Integrate tool execution into the agent Workflow: add tools and `stopWhen: stepCountIs(5)` to `generateText` for agentic looping up to the Tool Call Limit (default: 5)
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
- `src/tools/`: new module (ToolDefinition interface, ToolRegistry)
- `vitest.config.ts`: no new bindings needed
- Dependencies: none (Vercel AI SDK already supports tool calls)
