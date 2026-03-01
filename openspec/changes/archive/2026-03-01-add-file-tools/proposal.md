## Why

The assistant currently has no way to persist or manage files. Adding file operation tools enables the LLM to store notes, save generated content, and manage documents in an R2 bucket — completing the "basic tools" tier alongside web search and calendar.

## What Changes

- Add four file operation tools: `list_files` (low), `read_file` (low), `write_file` (medium), `delete_file` (high)
- Add path traversal prevention for R2 file keys
- Add R2 bucket binding (`FILE_BUCKET`) to the agent workflow
- Register file tools conditionally (when `FILE_BUCKET` is bound)

## Capabilities

### New Capabilities

_(none — file operations are already specified in the existing tools spec)_

### Modified Capabilities

_(none — implementing existing spec requirements, no spec-level changes needed)_

## Impact

- **New files**: `src/tools/files.ts` (tool definitions), `test/unit/tools/files.test.ts`
- **Modified files**: `src/agent/workflow.ts` (register file tools), `src/index.ts` (add R2 binding type)
- **Dependencies**: None (R2 is a Cloudflare built-in)
- **Bindings**: `FILE_BUCKET` (R2) added to wrangler.toml and vitest.config.ts
