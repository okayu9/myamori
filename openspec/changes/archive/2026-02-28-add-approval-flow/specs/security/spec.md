## MODIFIED Requirements

### Requirement: Approval Flow

The approval flow SHALL be triggered when a tool with risk level `high` is invoked.

The system SHALL:

1. Save the pending operation to D1 with a timeout of 10 minutes.
2. Send a preview of the operation to Telegram with an inline keyboard (Approve/Reject buttons).
3. On **Approve**: execute the tool and send the result directly to Telegram.
4. On **Reject**: cancel the operation and notify the user via Telegram.
5. On **timeout** (10 minutes elapsed): mark as expired. If the user later clicks a button, respond that the approval has expired.

The tool SHALL return a message to the LLM indicating that approval has been requested, so the LLM can inform the user in its reply.

Approved tool results SHALL be sent directly to Telegram, not routed back through the LLM.

#### Scenario: Approval granted

- **WHEN** a high-risk tool is invoked
- **AND** the user clicks Approve within 10 minutes
- **THEN** the tool is executed
- **AND** the result is sent directly to Telegram

#### Scenario: Approval rejected

- **WHEN** a high-risk tool is invoked
- **AND** the user clicks Reject
- **THEN** the operation is cancelled
- **AND** the user is notified via Telegram

#### Scenario: Approval timeout

- **WHEN** a high-risk tool is invoked
- **AND** the user does not respond within 10 minutes
- **THEN** the approval is marked as expired
- **AND** if the user later clicks a button, they are informed that the approval has expired

#### Scenario: LLM informed of pending approval

- **WHEN** a high-risk tool is invoked
- **THEN** the tool returns a message to the LLM indicating approval has been requested
- **AND** the LLM can inform the user in its reply

#### Scenario: Double-click prevention

- **WHEN** the user clicks Approve or Reject on an already-resolved approval
- **THEN** the system responds that the approval has already been resolved
- **AND** no duplicate execution occurs