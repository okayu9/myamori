import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../../src/db";
import { memories } from "../../../src/db/schema";
import { retrieveMemories } from "../../../src/memory/retriever";

function getDb() {
	return createDb(env.DB);
}

function createMockAi(): Ai {
	return {
		run: async () => ({ data: [[0.5, 0.5, 0.5]] }),
	} as unknown as Ai;
}

function createMockVectorize(
	matches: { id: string; score: number; metadata?: Record<string, unknown> }[],
): VectorizeIndex {
	return {
		query: async () => ({
			matches: matches.map((m) => ({
				id: m.id,
				score: m.score,
				metadata: m.metadata,
			})),
			count: matches.length,
		}),
	} as unknown as VectorizeIndex;
}

async function insertMemory(
	db: ReturnType<typeof getDb>,
	id: string,
	chatId: string,
	summary: string,
) {
	await db.insert(memories).values({
		id,
		chatId,
		summary,
		createdAt: new Date().toISOString(),
	});
}

describe("retrieveMemories", () => {
	beforeEach(async () => {
		const db = getDb();
		await db.delete(memories);
	});

	it("returns memories above threshold", async () => {
		const db = getDb();
		await insertMemory(db, "mem-1", "chat-1", "Discussed weather forecast");
		await insertMemory(db, "mem-2", "chat-1", "Talked about dinner plans");

		const vectorize = createMockVectorize([
			{ id: "mem-1", score: 0.85 },
			{ id: "mem-2", score: 0.75 },
		]);
		const ai = createMockAi();

		const result = await retrieveMemories(vectorize, ai, db, {
			chatId: "chat-1",
			query: "What was the weather?",
		});

		expect(result).toHaveLength(2);
		expect(result[0]?.summary).toBe("Discussed weather forecast");
		expect(result[0]?.score).toBe(0.85);
	});

	it("filters out memories below threshold", async () => {
		const db = getDb();
		await insertMemory(db, "mem-1", "chat-1", "High relevance");
		await insertMemory(db, "mem-2", "chat-1", "Low relevance");

		const vectorize = createMockVectorize([
			{ id: "mem-1", score: 0.8 },
			{ id: "mem-2", score: 0.5 },
		]);
		const ai = createMockAi();

		const result = await retrieveMemories(vectorize, ai, db, {
			chatId: "chat-1",
			query: "test",
		});

		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe("mem-1");
	});

	it("returns empty array when no matches", async () => {
		const vectorize = createMockVectorize([]);
		const ai = createMockAi();
		const db = getDb();

		const result = await retrieveMemories(vectorize, ai, db, {
			chatId: "chat-1",
			query: "anything",
		});

		expect(result).toHaveLength(0);
	});

	it("respects custom threshold", async () => {
		const db = getDb();
		await insertMemory(db, "mem-1", "chat-1", "Memory");

		const vectorize = createMockVectorize([{ id: "mem-1", score: 0.6 }]);
		const ai = createMockAi();

		const resultDefault = await retrieveMemories(vectorize, ai, db, {
			chatId: "chat-1",
			query: "test",
		});
		expect(resultDefault).toHaveLength(0);

		const resultCustom = await retrieveMemories(vectorize, ai, db, {
			chatId: "chat-1",
			query: "test",
			threshold: 0.5,
		});
		expect(resultCustom).toHaveLength(1);
	});
});
