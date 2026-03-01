## Context

The assistant has tools for files, calendar, web search, and scheduling, but no email capability. The existing spec defines a forwarding-based email reader: users forward emails to a Cloudflare Email Workers address, the system ingests them (parse, summarize, store), and the LLM can search/read them via tools.

Cloudflare Email Workers provide an `email()` handler that receives a `ForwardableEmailMessage` with a `raw` ReadableStream of the MIME content. The `postal-mime` library parses MIME into structured data (headers, text, html, attachments).

## Goals / Non-Goals

**Goals:**
- Receive forwarded emails via Cloudflare Email Workers handler
- Parse MIME content and generate LLM summary at ingestion time
- Store metadata + summary in D1, raw body + attachments in R2
- Provide `search_emails` and `read_email` tools for the LLM agent
- Optionally notify the user via Telegram when a new email arrives

**Non-Goals:**
- Direct mailbox access (IMAP/POP3/Gmail API) — forwarding only
- Sending or replying to emails
- Attachment preview or rendering — store raw only
- Full-text search over email body — search is over subject + summary only

## Decisions

### 1. Email Worker as a separate export (not a separate Worker)

The email handler will be exported from the same `src/index.ts` module alongside `fetch`, `scheduled`, and `queue`. Cloudflare Workers supports multiple handlers in one worker.

**Why:** Shares bindings (D1, R2, env vars) without cross-worker communication. Simpler deployment.

**Alternative:** Separate Worker with service bindings — rejected as unnecessary complexity for single-user.

### 2. MIME parsing with `postal-mime`

Use `postal-mime` to parse the raw email stream into structured fields (from, to, subject, date, text body, HTML body, attachments).

**Why:** Already specified in the project spec. Lightweight, well-maintained, designed for Cloudflare Workers (no Node.js dependencies).

### 3. LLM summarization at ingestion time

Generate a one-line summary of the email at ingestion by calling the Anthropic API directly (not via the agent workflow). Use a fast, cheap model (claude-haiku).

**Why:** Enables keyword search over summaries without re-reading full bodies. One-time cost per email. Calling the agent workflow would be overkill — no tools or multi-turn needed.

**Alternative:** Summarize on-demand when searched — rejected because it adds latency to every search and requires reading from R2 each time.

### 4. D1 schema for email metadata

```
emails table:
  id            TEXT PRIMARY KEY (UUID)
  from_address  TEXT NOT NULL
  to_address    TEXT NOT NULL
  subject       TEXT NOT NULL
  summary       TEXT NOT NULL
  received_at   TEXT NOT NULL (ISO 8601)
  r2_key        TEXT NOT NULL (path to raw body in R2)
  created_at    TEXT NOT NULL (ISO 8601)
```

Index on `received_at` for date-ordered listing. Search uses SQL `LIKE` on subject and summary columns.

**Why:** Matches existing schema patterns (text columns, ISO 8601 dates, UUID PKs). `LIKE` is sufficient for single-user volume — no need for FTS5.

### 5. R2 storage layout

Store email body and attachments under `emails/<id>/body.txt` and `emails/<id>/attachments/<filename>`. Only the text body is stored (HTML stripped to text). Attachments are stored raw.

**Why:** Simple key structure. Text-only body keeps storage small and is what the LLM needs. Attachments stored for potential future use.

### 6. Telegram notification (optional)

When `EMAIL_NOTIFICATION_CHAT_ID` is configured, send a brief notification to Telegram on ingestion: sender, subject, and summary. Uses the existing `TelegramAdapter.sendReply()`.

**Why:** Users want to know about important forwarded emails immediately. Reuses existing Telegram infrastructure.

### 7. Email tools — both low risk

- `search_emails`: keyword search over subject + summary in D1. Returns list of matches with id, sender, subject, date, summary.
- `read_email`: retrieve full body text from R2 by email ID. Returns the text content.

Both are read-only, no mutations, no external API calls → risk level `low`.

## Risks / Trade-offs

- **[LLM cost at ingestion]** → Each email costs one Haiku API call. Acceptable for forwarded emails (low volume). Rate limiting via Cloudflare Email Workers max message size (25MB).
- **[D1 LIKE search performance]** → Linear scan. Fine for hundreds/low thousands of emails. If scale becomes an issue, migrate to FTS5 or Vectorize.
- **[No HTML rendering]** → Some emails are HTML-only with no text part. Use `html-to-text` or simple regex to extract text from HTML body as fallback.
- **[Email Workers local dev]** → Cloudflare now supports local email testing via `wrangler dev` with POST to `/cdn-cgi/handler/email`. Tests will mock the email message interface.
