import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { createDb } from "../db";
import { messages } from "../db/schema";

type Db = ReturnType<typeof createDb>;

const HISTORY_LIMIT = 20;

export async function loadHistory(db: Db, chatId: string) {
	const rows = await db
		.select({ role: messages.role, content: messages.content })
		.from(messages)
		.where(eq(messages.chatId, chatId))
		.orderBy(desc(messages.createdAt))
		.limit(HISTORY_LIMIT);

	return rows.reverse().map((row) => ({
		role: row.role as "user" | "assistant",
		content: row.content,
	}));
}

export async function saveMessages(
	db: Db,
	chatId: string,
	userContent: string,
	assistantContent: string,
) {
	const now = new Date().toISOString();
	await db.insert(messages).values([
		{
			id: nanoid(),
			chatId,
			role: "user" as const,
			content: userContent,
			createdAt: now,
		},
		{
			id: nanoid(),
			chatId,
			role: "assistant" as const,
			content: assistantContent,
			createdAt: now,
		},
	]);
}
