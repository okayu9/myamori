# Channels Specification

## Purpose

Channel abstraction layer that normalizes interactions from different messaging platforms into a common format, with Telegram as the Phase 1 implementation.

## Requirements

### Requirement: Channel Abstraction

The system SHALL define a common `IncomingMessage` type and a `ChannelAdapter` interface shared by all channel implementations.

A `ChannelAdapter` SHALL be responsible for:

- Webhook request verification.
- Parsing incoming requests into `IncomingMessage`.
- Sending text replies.
- Sending approval requests with approve/reject button UI.

#### Scenario: Adapter implements common interface

- **WHEN** a new channel adapter is created
- **THEN** it implements the `ChannelAdapter` interface
- **AND** produces `IncomingMessage` objects from incoming requests

### Requirement: Telegram Webhook Mode

The Telegram adapter SHALL receive messages via Bot API webhooks (set via `setWebhook`).

The system SHALL NOT use long polling (`getUpdates`), as Workers' stateless execution model requires a push-based approach.

#### Scenario: Telegram uses webhook mode

- **WHEN** a Telegram message is sent to the bot
- **THEN** the adapter receives it as an HTTP POST from the Telegram Bot API
- **AND** does not use long polling

### Requirement: Async Response

The Worker SHALL return HTTP 200 to the Telegram webhook immediately and process the message asynchronously using `waitUntil`.

The actual reply SHALL be sent via the Telegram Bot API `sendMessage` method.

#### Scenario: Async reply via Bot API

- **WHEN** a Telegram webhook request arrives
- **THEN** the Worker returns HTTP 200 immediately
- **AND** sends the LLM result via `sendMessage` after processing completes

### Requirement: Webhook Verification

The Telegram adapter SHALL verify incoming webhook requests using the `X-Telegram-Bot-Api-Secret-Token` header.

The secret token SHALL be set when configuring the webhook via `setWebhook` and stored as a Cloudflare Secret.

#### Scenario: Valid webhook request accepted

- **WHEN** a webhook request arrives with a valid secret token header
- **THEN** the request is processed

#### Scenario: Invalid webhook request rejected

- **WHEN** a webhook request arrives with an invalid or missing secret token header
- **THEN** the request is rejected with HTTP 401

### Requirement: Topic-Based Conversations

The system SHALL use a Telegram supergroup with Forum mode (Topics) enabled to organize conversations by topic.

The adapter SHALL extract `message_thread_id` from incoming updates and use it to scope conversation history and route replies to the correct topic.

#### Scenario: Message routed by topic

- **WHEN** a message arrives with a `message_thread_id`
- **THEN** the adapter includes the topic ID in the `IncomingMessage`
- **AND** replies are sent to the same topic

### Requirement: Message Normalization

The Telegram adapter SHALL parse Telegram `Update` objects into the normalized `IncomingMessage` format, which includes: user ID, text content, optional attachments (photos, documents), chat ID, and message thread ID (topic).

#### Scenario: Telegram Update normalized

- **WHEN** a Telegram `Update` object is received
- **THEN** the adapter extracts user ID, text content, attachments, chat ID, and message thread ID
- **AND** produces an `IncomingMessage` object

### Requirement: Future Extensibility

Future channel adapters SHALL implement the same `ChannelAdapter` interface. When Slack support is added, it SHOULD use the Slack Bolt SDK in HTTP mode (not socket mode).

#### Scenario: Slack adapter uses same interface

- **WHEN** a Slack adapter is implemented
- **THEN** it implements the `ChannelAdapter` interface
- **AND** uses HTTP mode instead of socket mode
