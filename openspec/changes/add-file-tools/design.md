## Context

The assistant has web search and calendar tools but cannot persist or manage files. The tools spec already defines four file operations (`list_files`, `read_file`, `write_file`, `delete_file`) using R2 as a sandboxed file store. This change implements those requirements.

Existing tool patterns (calendar, web search) use `defineTool` with Zod schemas and explicit risk levels, registered conditionally in `workflow.ts`. File tools follow the same pattern.

## Goals / Non-Goals

**Goals:**

- Implement four file tools with R2 as the storage backend
- Enforce path traversal prevention on all file keys
- Follow existing tool patterns (`defineTool`, Zod, conditional registration)
- Add R2 binding to workflow and index types

**Non-Goals:**

- Directory creation or nested folder management (R2 is flat key-value; slash-delimited keys give the appearance of directories)
- File size limits (rely on R2's built-in 5 GiB limit per object)
- File type validation or content scanning
- Presigned URLs or direct download links

## Decisions

### 1. Single factory function `createFileTools(bucket)`

Same pattern as `createCalendarTools(client, db)`. Accepts an `R2Bucket` binding and returns an array of `ToolDefinition`. No additional dependencies needed — R2 API is built into Workers.

### 2. Path validation as a shared helper

A `validateFileKey(key)` function checks the key against the spec's allowlist (alphanumeric, hyphens, underscores, slashes, dots). Rejects `..`, leading `/`, empty segments, and keys starting with `.`. Applied to all four tools before any R2 operation.

### 3. `list_files` returns metadata only

Returns key, size, and lastModified for each object. Accepts an optional `prefix` parameter for directory-like filtering and an optional `limit` (default 100, max 1000). Uses R2's `list()` API with cursor-based pagination exposed via a `cursor` parameter.

### 4. `read_file` returns text content

Returns the file body as text via `R2ObjectBody.text()`. For binary files, this will return garbled output — acceptable for Phase 1 since the LLM primarily works with text. A future enhancement could add base64 encoding for binary content.

### 5. `write_file` uses `medium` risk

Per spec, `write_file` is medium risk (reported). The LLM is instructed via system prompt to report the action in its reply. No approval flow needed.

### 6. `delete_file` uses `high` risk

Per spec, `delete_file` requires approval before execution — consistent with the calendar tool's `delete_event`.

## Risks / Trade-offs

- **Large file reads** — `R2ObjectBody.text()` loads the entire file into memory. Workers have a 128 MB memory limit. → Mitigation: Acceptable for text files. Binary/large file handling deferred.
- **No atomicity** — `write_file` overwrites without conflict detection. → Mitigation: Single-user system; concurrent writes are unlikely.
- **Flat namespace** — R2 has no real directories. `list_files` with prefix gives directory-like behavior. → Mitigation: Document this in the tool description for the LLM.
