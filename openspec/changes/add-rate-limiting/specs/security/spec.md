## MODIFIED Requirements

### Requirement: Rate Limiting

The system SHALL implement KV-based rate limiting per user, covering messages per time window.

The rate limiter SHALL use a fixed window counter stored in Cloudflare KV with auto-expiring keys (TTL = window duration).

The KV key format SHALL be `ratelimit:{userId}:{windowKey}` where `windowKey` is derived from the current timestamp and window size.

Default limits SHALL be 20 messages per 1-hour window, configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` environment variables.

When a user exceeds the limit, the system SHALL send a Telegram reply informing them and SHALL NOT dispatch the message to the agent workflow.

#### Scenario: Rate limit exceeded

- **WHEN** a user exceeds the message rate limit within a time window
- **THEN** subsequent messages are rejected with a Telegram reply
- **AND** the message is not dispatched to the agent workflow

#### Scenario: Rate limit resets after window

- **WHEN** the time window expires
- **THEN** the user can send messages again
- **AND** the KV key has been auto-expired via TTL

#### Scenario: First message in window

- **WHEN** a user sends the first message in a new time window
- **THEN** the counter is initialized to 1
- **AND** the message is processed normally
