## 1. Bindings

- [x] 1.1 Add `FILE_BUCKET` (R2) to `Bindings` type in `src/index.ts`
- [x] 1.2 Add `FILE_BUCKET` to `AgentWorkflowEnv` in `src/agent/workflow.ts`

## 2. File Tools Implementation

- [x] 2.1 Create `src/tools/files.ts` with `validateFileKey(key)` helper — reject `..`, leading `/`, empty segments, keys starting with `.`, and characters outside `[a-zA-Z0-9\-_/.]`
- [x] 2.2 Implement `list_files` (risk: `low`) — accepts optional `prefix`, `limit` (default 100, max 1000), `cursor`; returns key, size, lastModified
- [x] 2.3 Implement `read_file` (risk: `low`) — accepts `key`; returns file content as text; throws if not found
- [x] 2.4 Implement `write_file` (risk: `medium`) — accepts `key` and `content`; writes to R2
- [x] 2.5 Implement `delete_file` (risk: `high`) — accepts `key`; deletes from R2; throws if not found

## 3. Workflow Integration

- [x] 3.1 Register file tools in `workflow.ts` conditionally on `FILE_BUCKET` being bound

## 4. Tests

- [x] 4.1 Unit tests for `validateFileKey` — valid keys pass, `..`/leading `/`/invalid chars rejected
- [x] 4.2 Unit tests for `list_files` — returns metadata, respects prefix and limit
- [x] 4.3 Unit tests for `read_file` — returns text content, throws on missing key
- [x] 4.4 Unit tests for `write_file` — writes content to R2
- [x] 4.5 Unit tests for `delete_file` — deletes from R2, throws on missing key

## 5. Verification

- [x] 5.1 Run `bunx vitest run` and confirm all tests pass
- [x] 5.2 Run `bunx biome check` and confirm no lint/format issues
- [x] 5.3 Run `bunx tsc --noEmit` and confirm no type errors
