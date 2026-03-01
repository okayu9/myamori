import { and, eq, inArray } from "drizzle-orm";
import type { createDb } from "../db";
import { memories } from "../db/schema";
import { embedText } from "./embedder";

export interface RetrievedMemory {
	id: string;
	summary: string;
	score: number;
}

export async function retrieveMemories(
	vectorize: VectorizeIndex,
	ai: Ai,
	db: ReturnType<typeof createDb>,
	params: {
		chatId: string;
		query: string;
		topK?: number;
		threshold?: number;
	},
): Promise<RetrievedMemory[]> {
	const topK = params.topK ?? 5;
	const threshold = params.threshold ?? 0.7;

	const queryVector = await embedText(ai, params.query);

	const matches = await vectorize.query(queryVector, {
		topK,
		filter: { chatId: params.chatId },
	});

	const filtered = matches.matches.filter((m) => m.score >= threshold);
	if (filtered.length === 0) {
		return [];
	}

	const ids = filtered.map((m) => m.id);
	const rows = await db
		.select({ id: memories.id, summary: memories.summary })
		.from(memories)
		.where(and(inArray(memories.id, ids), eq(memories.chatId, params.chatId)));

	const summaryMap = new Map(rows.map((r) => [r.id, r.summary]));

	return filtered
		.map((m) => ({
			id: m.id,
			summary: summaryMap.get(m.id) ?? "",
			score: m.score,
		}))
		.filter((m) => m.summary !== "");
}
