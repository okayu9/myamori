## ADDED Requirements

### Requirement: Email ingestion via Email Workers

The system SHALL receive forwarded emails via a Cloudflare Email Workers handler exported from the main worker module.

When an email arrives, the system SHALL:

1. Parse the MIME content using `postal-mime`.
2. Extract the text body. If no text body is available, the system SHALL convert the HTML body to plain text.
3. Generate a concise summary of the email content via a single LLM call (claude-haiku).
4. Store metadata (from, to, subject, summary, received date) in D1.
5. Store the full text body in R2 under `emails/<id>/body.txt`.
6. Store any attachments in R2 under `emails/<id>/attachments/<filename>`.

#### Scenario: Email received and ingested

- **WHEN** an email is forwarded to the dedicated Email Workers address
- **THEN** the MIME content is parsed
- **AND** metadata and an LLM-generated summary are stored in D1
- **AND** the text body is stored in R2
- **AND** any attachments are stored in R2

#### Scenario: HTML-only email ingested

- **WHEN** an email with no text body but an HTML body is received
- **THEN** the system converts the HTML body to plain text
- **AND** the plain text is stored as the email body in R2

### Requirement: Email notification

When `EMAIL_NOTIFICATION_CHAT_ID` is configured, the system SHALL send a Telegram notification upon ingesting a new email. The notification SHALL include the sender, subject, and summary.

#### Scenario: Notification sent on new email

- **WHEN** an email is ingested
- **AND** `EMAIL_NOTIFICATION_CHAT_ID` is configured
- **THEN** a Telegram message is sent with the sender, subject, and summary

#### Scenario: No notification when not configured

- **WHEN** an email is ingested
- **AND** `EMAIL_NOTIFICATION_CHAT_ID` is not configured
- **THEN** no Telegram notification is sent

### Requirement: Search emails tool

The system SHALL provide a `search_emails` tool (risk: `low`) that performs keyword search over the subject and summary fields in D1.

The tool SHALL accept a `query` string and an optional `limit` (default 10, max 50).

The tool SHALL return a list of matching emails with: id, from, subject, received date, and summary.

#### Scenario: Search emails by keyword

- **WHEN** the LLM invokes `search_emails` with a query
- **THEN** D1 is queried for emails where subject or summary contains the query
- **AND** results are returned ordered by received date (newest first)

#### Scenario: Search with no results

- **WHEN** the LLM invokes `search_emails` with a query that matches no emails
- **THEN** an empty list is returned

### Requirement: Read email tool

The system SHALL provide a `read_email` tool (risk: `low`) that retrieves the full email body from R2 by email ID.

The tool SHALL accept an `emailId` string.

The tool SHALL return the email metadata (from, to, subject, date) and the full text body.

#### Scenario: Read email by ID

- **WHEN** the LLM invokes `read_email` with a valid email ID
- **THEN** the email metadata is retrieved from D1
- **AND** the full text body is retrieved from R2
- **AND** both are returned to the LLM

#### Scenario: Read nonexistent email

- **WHEN** the LLM invokes `read_email` with an ID that does not exist
- **THEN** an error is returned indicating the email was not found

### Requirement: Email database schema

The system SHALL store email metadata in a D1 `emails` table with the following columns:

- `id` (TEXT, PRIMARY KEY)
- `from_address` (TEXT, NOT NULL)
- `to_address` (TEXT, NOT NULL)
- `subject` (TEXT, NOT NULL)
- `summary` (TEXT, NOT NULL)
- `received_at` (TEXT, NOT NULL, ISO 8601)
- `r2_key` (TEXT, NOT NULL)
- `created_at` (TEXT, NOT NULL, ISO 8601)

An index SHALL exist on `received_at` for date-ordered queries.

#### Scenario: Email metadata stored in D1

- **WHEN** an email is ingested
- **THEN** a row is inserted into the `emails` table with all required fields
- **AND** the `id` is a UUID
- **AND** `received_at` is the email's Date header value in ISO 8601
