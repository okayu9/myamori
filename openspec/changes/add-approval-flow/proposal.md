## Why

High-risk tools (file deletion, calendar mutations) currently reject with a placeholder error. The approval flow is the missing piece that makes these operations usable — the user approves or rejects via Telegram inline buttons before execution.

## What Changes

- Add D1 table for pending approvals (tool name, serialized input, status, expiry)
- Replace the placeholder high-risk rejection in `ToolRegistry` with actual approval request creation
- Handle Telegram `callback_query` updates (Approve/Reject button presses) in the webhook
- Execute approved operations and send results directly to Telegram
- Auto-expire approvals after 10 minutes (lazy expiry checked on callback)
- Send inline keyboard previews showing what the tool will do

## Capabilities

### New Capabilities

_None — approval flow is already defined in the `security` spec._

### Modified Capabilities

- `security`: Implementing the Approval Flow requirement (D1 persistence, Telegram inline keyboard, approve/reject/timeout handling)
- `tools`: Updating the Risk Levels requirement — high-risk tools now request approval instead of rejecting with a placeholder error

## Impact

- `src/db/schema.ts`: new `pendingApprovals` table
- `src/approval/handler.ts`: new module for creating and resolving approvals
- `src/tools/registry.ts`: accept approval callback, replace placeholder rejection
- `src/index.ts`: handle `callback_query` in Telegram webhook
- `src/channels/telegram.ts`: add `sendMessageWithButtons` and `answerCallbackQuery` methods
- `drizzle/migrations/`: new migration for `pending_approvals` table
- Dependencies: none (uses existing D1 + Telegram Bot API)