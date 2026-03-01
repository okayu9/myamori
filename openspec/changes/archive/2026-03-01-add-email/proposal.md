## Why

The assistant currently has no way to access email content. Users need to ask about forwarded emails, search past messages, and get notified when important emails arrive. Email is a Phase 1 feature defined in the existing spec but not yet implemented.

## What Changes

- Add Cloudflare Email Workers handler to receive forwarded emails
- Parse MIME content with `postal-mime`, store metadata + LLM summary in D1, raw body in R2
- Implement `search_emails` and `read_email` LLM tools (both risk: low)
- Add optional Telegram notification on new email arrival
- Add D1 migration for `emails` table
- Register email tools in the agent workflow

## Capabilities

### New Capabilities
- `email`: Email ingestion pipeline (Email Workers handler, MIME parsing, LLM summarization, D1/R2 storage) and LLM-accessible search/read tools

### Modified Capabilities

(none)

## Impact

- **New files**: `src/channels/email-worker.ts`, `src/tools/email.ts`, `src/email/ingestion.ts`
- **Modified files**: `src/agent/workflow.ts` (register email tools), `src/db/schema.ts` (emails table), `src/index.ts` (export email worker)
- **Dependencies**: `postal-mime` (MIME parsing, already in spec)
- **Infrastructure**: Cloudflare Email Workers routing, R2 bucket (existing), D1 (existing)
- **Config**: `EMAIL_NOTIFICATION_CHAT_ID` env var for Telegram notifications
