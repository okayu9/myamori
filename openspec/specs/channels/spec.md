# Channels Specification

## Purpose

Channel abstraction layer that normalizes interactions from different messaging platforms into a common format, with Discord as the Phase 1 implementation.

## Requirements

### Requirement: Channel Abstraction

The system SHALL define a common `IncomingMessage` type and a `ChannelAdapter` interface shared by all channel implementations.

A `ChannelAdapter` SHALL be responsible for:

- Webhook request signature verification.
- Parsing incoming requests into `IncomingMessage`.
- Sending text replies.
- Sending approval requests with approve/reject button UI.

### Requirement: Discord Webhook Mode

The Discord adapter SHALL use the Interaction Endpoint (Webhook) mode, not the Bot Gateway (WebSocket) mode.

The system SHALL NOT maintain persistent WebSocket connections, as Workers' stateless execution model is unsuitable for long-lived connections.

### Requirement: Deferred Response

Because Discord requires Interaction responses within 3 seconds and LLM calls exceed this limit, the Discord adapter SHALL:

1. Immediately respond with `deferReply` to acknowledge the interaction.
2. Process the LLM call asynchronously.
3. Send the result via `followUp` (editing the deferred reply).

### Requirement: Slash Command

The system SHALL register a `/ask` slash command that accepts text input and optional file attachments.

Bot permissions SHALL be kept to the minimum required.

### Requirement: Message Normalization

The Discord adapter SHALL parse Discord interaction payloads into the normalized `IncomingMessage` format, which includes: user ID, text content, optional attachments, channel/thread context, and interaction token for follow-up replies.

### Requirement: Future Extensibility

When Slack support is added, it SHOULD implement the same `ChannelAdapter` interface using the Slack Bolt SDK in HTTP mode (not socket mode).
