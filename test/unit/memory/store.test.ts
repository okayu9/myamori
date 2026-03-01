import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../../src/db";
import { memories } from "../../../src/db/schema";
import { storeMemory } from "../../../src/memory/store";

function getDb() {
	return createDb(env.DB);
}

function createMockVectorize() {
	const stored: { id: string; values: number[]; metadata: unknown }[] = [];
	return {
		mock: stored,
		binding: {
			upsert: async (
				vectors: { id: string; values: number[]; metadata: unknown }[],
			) => {
				stored.push(...vectors);
				return { ids: vectors.map((v) => v.id), count: vectors.length };
			},
		} as unknown as VectorizeIndex,
	};
}

describe("storeMemory", () => {
	beforeEach(async () => {
		const db = getDb();
		await db.delete(memories);
	});

	it("inserts into Vectorize and D1", async () => {
		const db = getDb();
		const { mock, binding } = createMockVectorize();
		const vector = [0.1, 0.2, 0.3];

		const id = await storeMemory(binding, db, {
			chatId: "chat-123",
			summary: "User asked about weather",
			vector,
		});

		expect(id).toBeDefined();
		expect(typeof id).toBe("string");

		// Check Vectorize was called
		expect(mock).toHaveLength(1);
		expect(mock[0]?.values).toEqual(vector);
		expect(mock[0]?.metadata).toEqual(
			expect.objectContaining({ chatId: "chat-123" }),
		);

		// Check D1 row
		const rows = await db.select().from(memories);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.chatId).toBe("chat-123");
		expect(rows[0]?.summary).toBe("User asked about weather");
		expect(rows[0]?.id).toBe(id);
	});

	it("generates a UUID for the memory id", async () => {
		const db = getDb();
		const { binding } = createMockVectorize();

		const id1 = await storeMemory(binding, db, {
			chatId: "chat-1",
			summary: "First memory",
			vector: [0.1],
		});
		const id2 = await storeMemory(binding, db, {
			chatId: "chat-1",
			summary: "Second memory",
			vector: [0.2],
		});

		expect(id1).not.toBe(id2);
	});
});
