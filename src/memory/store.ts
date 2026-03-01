import type { createDb } from "../db";
import { memories } from "../db/schema";

export async function storeMemory(
	vectorize: VectorizeIndex,
	db: ReturnType<typeof createDb>,
	params: {
		chatId: string;
		summary: string;
		vector: number[];
	},
): Promise<string> {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	await vectorize.upsert([
		{
			id,
			values: params.vector,
			metadata: {
				chatId: params.chatId,
				createdAt: now,
			},
		},
	]);

	await db.insert(memories).values({
		id,
		chatId: params.chatId,
		summary: params.summary,
		createdAt: now,
	});

	return id;
}
