import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
