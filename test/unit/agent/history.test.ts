import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { loadHistory, saveMessages } from "../../../src/agent/history";
import { createDb } from "../../../src/db";

describe("history", () => {
	function getDb() {
		return createDb(env.DB);
	}

	describe("loadHistory", () => {
		it("returns empty array when no messages exist", async () => {
			const db = getDb();
			const result = await loadHistory(db, "chat-empty");
			expect(result).toEqual([]);
		});

		it("returns messages in chronological order", async () => {
			const db = getDb();
			await saveMessages(db, "chat-order", "hello", "hi there");
			const result = await loadHistory(db, "chat-order");
			expect(result).toEqual([
				{ role: "user", content: "hello" },
				{ role: "assistant", content: "hi there" },
			]);
		});

		it("limits to 20 most recent messages", async () => {
			const db = getDb();
			for (let i = 0; i < 12; i++) {
				const baseTime = new Date(2025, 0, 1, 0, 0, i);
				await saveMessages(
					db,
					"chat-limit",
					`msg-${i}`,
					`reply-${i}`,
					baseTime,
				);
			}
			const result = await loadHistory(db, "chat-limit");
			expect(result).toHaveLength(20);
			expect(result[0]).toEqual({ role: "user", content: "msg-2" });
			expect(result[19]).toEqual({ role: "assistant", content: "reply-11" });
		});

		it("isolates history by chatId", async () => {
			const db = getDb();
			await saveMessages(db, "chat-a", "hello-a", "reply-a");
			await saveMessages(db, "chat-b", "hello-b", "reply-b");
			const resultA = await loadHistory(db, "chat-a");
			expect(resultA).toEqual([
				{ role: "user", content: "hello-a" },
				{ role: "assistant", content: "reply-a" },
			]);
		});
	});

	describe("saveMessages", () => {
		it("saves user and assistant messages", async () => {
			const db = getDb();
			await saveMessages(db, "chat-save", "user msg", "assistant msg");
			const result = await loadHistory(db, "chat-save");
			expect(result).toHaveLength(2);
			expect(result[0]?.role).toBe("user");
			expect(result[1]?.role).toBe("assistant");
		});
	});
});
