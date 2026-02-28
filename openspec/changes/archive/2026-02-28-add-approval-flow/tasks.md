## 1. Database Schema

- [x] 1.1 Add `pendingApprovals` table to `src/db/schema.ts` (id, chatId, threadId, toolName, toolInput, status, createdAt, expiresAt)
- [x] 1.2 Generate Drizzle migration with `bunx drizzle-kit generate`

## 2. Approval Handler

- [x] 2.1 Create `src/approval/handler.ts` with `createApproval(db, params)` — saves pending approval to D1, returns approval ID
- [x] 2.2 Add `resolveApproval(db, approvalId, action)` — atomic status update with `WHERE status = 'pending'` guard
- [x] 2.3 Add `getApproval(db, approvalId)` — fetch approval by ID with expiry check

## 3. Telegram Extensions

- [x] 3.1 Add `sendMessageWithInlineKeyboard(chatId, text, buttons, threadId?)` to `TelegramAdapter`
- [x] 3.2 Add `answerCallbackQuery(callbackQueryId, text?)` to `TelegramAdapter`
- [x] 3.3 Extend `telegramUpdateSchema` to parse `callback_query` updates

## 4. Registry Integration

- [x] 4.1 Add `onHighRisk` callback parameter to `ToolRegistry.toAISDKTools(options?)`
- [x] 4.2 Replace placeholder high-risk rejection with `onHighRisk` callback invocation

## 5. Webhook Handler

- [x] 5.1 Wire `onHighRisk` in `AgentWorkflow` — create approval + send inline keyboard
- [x] 5.2 Add callback query handling to `POST /telegram/webhook` in `src/index.ts` — parse callback data, resolve approval, execute tool or notify

## 6. Tests

- [x] 6.1 Unit tests for approval handler (create, resolve, expiry, double-click)
- [x] 6.2 Unit tests for Telegram inline keyboard and callback query parsing
- [x] 6.3 Unit tests for registry `onHighRisk` callback integration
- [x] 6.4 Integration test for callback query webhook flow (reject path, allowlist check)

## 7. Verification

- [x] 7.1 Run `bunx vitest run` and confirm all tests pass
- [x] 7.2 Run `bunx biome check` and confirm no lint/format issues
- [x] 7.3 Run `bunx tsc --noEmit` and confirm no type errors