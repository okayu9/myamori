import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logLLMCall, logToolExecution } from "../../../src/audit/logger";
import { createDb } from "../../../src/db";
import { auditLogs } from "../../../src/db/schema";

describe("audit logger", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	function getDb() {
		return createDb(env.DB);
	}

	describe("logLLMCall", () => {
		it("stores an llm_call entry with correct fields", async () => {
			const db = getDb();
			await logLLMCall(db, {
				chatId: "chat-1",
				model: "claude-haiku-4-5",
				promptTokens: 100,
				completionTokens: 50,
				durationMs: 1234,
			});

			const rows = await db
				.select()
				.from(auditLogs)
				.where(eq(auditLogs.chatId, "chat-1"));
			expect(rows).toHaveLength(1);

			const row = rows[0] ?? {
				type: "",
				chatId: "",
				createdAt: "",
				metadata: "{}",
			};
			expect(row.type).toBe("llm_call");
			expect(row.chatId).toBe("chat-1");
			expect(row.createdAt).toBeTruthy();

			const metadata = JSON.parse(row.metadata);
			expect(metadata.model).toBe("claude-haiku-4-5");
			expect(metadata.promptTokens).toBe(100);
			expect(metadata.completionTokens).toBe(50);
			expect(metadata.durationMs).toBe(1234);
		});

		it("does not throw on DB error", async () => {
			const db = getDb();
			vi.spyOn(db, "insert").mockImplementation(() => {
				throw new Error("DB unavailable");
			});

			await expect(
				logLLMCall(db, {
					chatId: "chat-err",
					model: "test",
					promptTokens: 0,
					completionTokens: 0,
					durationMs: 0,
				}),
			).resolves.toBeUndefined();
		});
	});

	describe("logToolExecution", () => {
		it("stores a tool_execution entry with correct fields", async () => {
			const db = getDb();
			await logToolExecution(db, {
				chatId: "chat-2",
				toolName: "web_search",
				status: "success",
				input: { query: "test query" },
				durationMs: 567,
			});

			const rows = await db
				.select()
				.from(auditLogs)
				.where(eq(auditLogs.chatId, "chat-2"));
			expect(rows).toHaveLength(1);

			const row = rows[0] ?? { type: "", metadata: "{}" };
			expect(row.type).toBe("tool_execution");

			const metadata = JSON.parse(row.metadata);
			expect(metadata.toolName).toBe("web_search");
			expect(metadata.status).toBe("success");
			expect(metadata.durationMs).toBe(567);
			expect(metadata.inputSummary).toBe('{"query":"test query"}');
		});

		it("truncates input summary to 200 characters", async () => {
			const db = getDb();
			const longInput = { data: "x".repeat(300) };

			await logToolExecution(db, {
				chatId: "chat-3",
				toolName: "big_tool",
				status: "success",
				input: longInput,
				durationMs: 100,
			});

			const rows = await db
				.select()
				.from(auditLogs)
				.where(eq(auditLogs.chatId, "chat-3"));
			const metadata = JSON.parse((rows[0] ?? { metadata: "{}" }).metadata);
			expect(metadata.inputSummary.length).toBe(200);
			expect(metadata.inputSummary).toMatch(/\.\.\.$/);
		});

		it("records error status", async () => {
			const db = getDb();
			await logToolExecution(db, {
				chatId: "chat-4",
				toolName: "failing_tool",
				status: "error",
				input: {},
				durationMs: 10,
			});

			const rows = await db
				.select()
				.from(auditLogs)
				.where(eq(auditLogs.chatId, "chat-4"));
			const metadata = JSON.parse((rows[0] ?? { metadata: "{}" }).metadata);
			expect(metadata.status).toBe("error");
		});

		it("does not throw on DB error", async () => {
			const db = getDb();
			vi.spyOn(db, "insert").mockImplementation(() => {
				throw new Error("DB unavailable");
			});

			await expect(
				logToolExecution(db, {
					chatId: "chat-err",
					toolName: "test",
					status: "success",
					input: {},
					durationMs: 0,
				}),
			).resolves.toBeUndefined();
		});
	});
});
