## MODIFIED Requirements

### Requirement: Channel Abstraction

The system SHALL define a common `IncomingMessage` type and a `ChannelAdapter` interface shared by all channel implementations.

A `ChannelAdapter` SHALL be responsible for:

- Webhook request signature verification.
- Parsing incoming requests into `IncomingMessage`.
- Sending text replies.
- Sending approval requests with approve/reject button UI.

#### Scenario: Adapter implements common interface

- **WHEN** a new channel adapter is created
- **THEN** it implements the `ChannelAdapter` interface
- **AND** produces `IncomingMessage` objects from incoming requests

### Requirement: Discord Webhook Mode

The Discord adapter SHALL use the Interaction Endpoint (Webhook) mode, not the Bot Gateway (WebSocket) mode.

The system SHALL NOT maintain persistent WebSocket connections, as Workers' stateless execution model is unsuitable for long-lived connections.

#### Scenario: Discord uses webhook mode

- **WHEN** a Discord interaction arrives
- **THEN** the adapter processes it as an HTTP webhook request
- **AND** does not establish a WebSocket connection

### Requirement: Deferred Response

Because Discord requires Interaction responses within 3 seconds and LLM calls exceed this limit, the Discord adapter SHALL:

1. Immediately respond with `deferReply` to acknowledge the interaction.
2. Process the LLM call asynchronously.
3. Send the result via `followUp` (editing the deferred reply).

#### Scenario: Deferred reply for LLM processing

- **WHEN** a Discord interaction is received
- **THEN** the adapter responds with `deferReply` within 3 seconds
- **AND** sends the LLM result via `followUp` after processing completes

### Requirement: Slash Command

The system SHALL register a `/ask` slash command that accepts text input and optional file attachments.

Bot permissions SHALL be kept to the minimum required.

#### Scenario: User invokes /ask command

- **WHEN** a user sends `/ask` with text input
- **THEN** the system processes the text as a user message
- **AND** returns the assistant's response

### Requirement: Message Normalization

The Discord adapter SHALL parse Discord interaction payloads into the normalized `IncomingMessage` format, which includes: user ID, text content, optional attachments, channel/thread context, and interaction token for follow-up replies.

#### Scenario: Discord payload normalized

- **WHEN** a Discord interaction payload is received
- **THEN** the adapter extracts user ID, text content, attachments, channel context, and interaction token
- **AND** produces an `IncomingMessage` object

### Requirement: Future Extensibility

Future channel adapters SHALL implement the same `ChannelAdapter` interface. When Slack support is added, it SHOULD use the Slack Bolt SDK in HTTP mode (not socket mode).

#### Scenario: Slack adapter uses same interface

- **WHEN** a Slack adapter is implemented
- **THEN** it implements the `ChannelAdapter` interface
- **AND** uses HTTP mode instead of socket mode
