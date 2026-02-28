## 1. Tool Types and Registry

- [x] 1.1 Create `src/tools/types.ts` with `ToolDefinition` interface (name, description, inputSchema, riskLevel, execute)
- [x] 1.2 Create `src/tools/registry.ts` with `ToolRegistry` class — `register()`, `getAll()`, `toAISDKTools()` methods
- [x] 1.3 Implement risk-level gating in `toAISDKTools()` — low/medium execute directly, high throws error message

## 2. Agent Integration

- [x] 2.1 Update `src/agent/prompt.ts` — `buildSystemPrompt()` accepts optional tool definitions and renders them in the Available Tools section, including medium-risk reporting instruction
- [x] 2.2 Update `src/agent/workflow.ts` — replace single `generateText` with tools and `maxSteps: 5` for agentic loop, create empty registry (no tools registered yet)

## 3. Tests

- [x] 3.1 Create `test/unit/tools/registry.test.ts` — test register, getAll, toAISDKTools, and risk-level gating (low executes, medium executes, high throws)
- [x] 3.2 Update `test/unit/agent/prompt.test.ts` — test system prompt with tool descriptions and without tools

## 4. Verification

- [x] 4.1 Run `bunx vitest run` and verify all tests pass
- [x] 4.2 Run `bunx biome check .` and fix any issues
- [x] 4.3 Run `bunx tsc --noEmit` and fix any type errors