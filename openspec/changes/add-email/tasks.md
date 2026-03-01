## 1. Database Schema

- [x] 1.1 Add `emails` table to `src/db/schema.ts` with columns: id, from_address, to_address, subject, summary, received_at, r2_key, created_at. Add index on received_at.
- [x] 1.2 Generate D1 migration with `bunx drizzle-kit generate`

## 2. Dependencies

- [x] 2.1 Install `postal-mime` package

## 3. Email Ingestion

- [x] 3.1 Create `src/email/ingestion.ts` with `ingestEmail(raw: ReadableStream, env)` function: parse MIME with postal-mime, extract text body (fallback: convert HTML to text), generate LLM summary via Anthropic API (claude-haiku), store metadata in D1, store body + attachments in R2
- [x] 3.2 Add `email()` handler export in `src/index.ts` that calls `ingestEmail`
- [x] 3.3 Add `EMAIL_NOTIFICATION_CHAT_ID` to Bindings type and optionally send Telegram notification after ingestion

## 4. Email Tools

- [x] 4.1 Create `src/tools/email.ts` with `createEmailTools(db, bucket)` factory returning `search_emails` and `read_email` tool definitions
- [x] 4.2 `search_emails` tool: accept `query` string and optional `limit` (default 10, max 50), LIKE search on subject + summary, return results ordered by received_at desc
- [x] 4.3 `read_email` tool: accept `emailId`, fetch metadata from D1 and body from R2, return combined result. Error if not found.

## 5. Tool Registration

- [x] 5.1 Register email tools in `src/agent/workflow.ts` (conditional on `FILE_BUCKET` being available since emails use R2)
- [x] 5.2 Register email tools in `buildToolRegistry()` in `src/index.ts` for the approval callback path

## 6. Tests

- [x] 6.1 Unit tests for email ingestion (`test/unit/email/ingestion.test.ts`): MIME parsing, HTML-to-text fallback, D1 insert, R2 put
- [x] 6.2 Unit tests for email tools (`test/unit/tools/email.test.ts`): search with results, search with no results, read existing email, read nonexistent email
- [x] 6.3 Unit test for `email()` handler export: verify it calls ingestEmail and handles errors

## 7. Verification

- [x] 7.1 Run `bunx tsc --noEmit` — no type errors
- [x] 7.2 Run `bunx biome check src/ test/` — no lint/format errors
- [x] 7.3 Run `bunx vitest run` — all tests pass
