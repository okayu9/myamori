## Why

The Telegram adapter currently echoes messages back. To become a useful assistant, we need the core agent loop: receive a message, call the LLM, and reply with the LLM's response. This is the foundation that all future features (tools, approval flow, scheduling) build on.

## What Changes

- Add `src/agent/` module with the agent loop: allowlist check → load history → build system prompt → call LLM → reply → save history
- Add D1 schema for conversation history using Drizzle ORM
- Integrate Vercel AI SDK with Anthropic provider for LLM invocation
- Add dynamic system prompt construction (role, date/time, available tools placeholder)
- Replace the echo reply in the webhook route with the agent loop
- Add `ALLOWED_USER_IDS` and `ANTHROPIC_API_KEY` bindings
- Scope: text responses only — tool execution, approval flow, audit logging, and rate limiting are separate future changes

## Capabilities

### New Capabilities

_None — the agent spec already covers this behavior._

### Modified Capabilities

- `agent`: Implementing the Message Processing Flow, LLM Abstraction, System Prompt, and Short-Term Memory requirements (text response path only; tool calls deferred)

## Impact

- `src/index.ts`: webhook handler calls agent instead of echo
- `src/agent/`: new module (agent loop, system prompt, conversation history)
- `src/db/`: new module (Drizzle schema, D1 migrations)
- `wrangler.toml.template`: add `ANTHROPIC_API_KEY` secret comment
- `vitest.config.ts`: add D1 test binding
- Dependencies: `@ai-sdk/anthropic` (new)