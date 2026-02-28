import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const messages = sqliteTable(
	"messages",
	{
		id: text("id").primaryKey(),
		chatId: text("chat_id").notNull(),
		role: text("role", { enum: ["user", "assistant"] }).notNull(),
		content: text("content").notNull(),
		createdAt: text("created_at").notNull(),
	},
	(table) => [
		index("idx_messages_chat_created").on(table.chatId, table.createdAt),
	],
);

export const auditLogs = sqliteTable(
	"audit_logs",
	{
		id: text("id").primaryKey(),
		type: text("type", { enum: ["llm_call", "tool_execution"] }).notNull(),
		chatId: text("chat_id").notNull(),
		metadata: text("metadata").notNull(),
		createdAt: text("created_at").notNull(),
	},
	(table) => [
		index("idx_audit_logs_chat_created").on(table.chatId, table.createdAt),
	],
);

export const pendingApprovals = sqliteTable("pending_approvals", {
	id: text("id").primaryKey(),
	chatId: text("chat_id").notNull(),
	threadId: integer("thread_id"),
	toolName: text("tool_name").notNull(),
	toolInput: text("tool_input").notNull(),
	status: text("status", {
		enum: ["pending", "approved", "rejected", "expired"],
	})
		.notNull()
		.default("pending"),
	createdAt: text("created_at").notNull(),
	expiresAt: text("expires_at").notNull(),
});
