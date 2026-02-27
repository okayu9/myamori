import { describe, expect, it } from "vitest";
import { TelegramAdapter } from "../../../src/channels/telegram";

const adapter = new TelegramAdapter("test-bot-token", "test-webhook-secret");

describe("TelegramAdapter", () => {
	describe("verifyRequest", () => {
		it("returns true for valid secret token", async () => {
			const req = new Request("http://localhost/webhook", {
				headers: { "x-telegram-bot-api-secret-token": "test-webhook-secret" },
			});
			expect(await adapter.verifyRequest(req)).toBe(true);
		});

		it("returns false for invalid secret token", async () => {
			const req = new Request("http://localhost/webhook", {
				headers: { "x-telegram-bot-api-secret-token": "wrong-secret" },
			});
			expect(await adapter.verifyRequest(req)).toBe(false);
		});

		it("returns false when header is missing", async () => {
			const req = new Request("http://localhost/webhook");
			expect(await adapter.verifyRequest(req)).toBe(false);
		});
	});

	describe("parseMessage", () => {
		it("parses valid text message", async () => {
			const body = {
				update_id: 1,
				message: {
					message_id: 100,
					from: { id: 42, first_name: "Test" },
					chat: { id: -1001, type: "supergroup" },
					text: "hello",
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const msg = await adapter.parseMessage(req);
			expect(msg).not.toBeNull();
			expect(msg?.userId).toBe("42");
			expect(msg?.text).toBe("hello");
			expect(msg?.chatId).toBe("-1001");
			expect(msg?.attachments).toEqual([]);
		});

		it("includes threadId when present", async () => {
			const body = {
				update_id: 2,
				message: {
					message_id: 101,
					from: { id: 42, first_name: "Test" },
					chat: { id: -1001, type: "supergroup" },
					text: "topic message",
					message_thread_id: 5,
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const msg = await adapter.parseMessage(req);
			expect(msg).not.toBeNull();
			expect(msg?.threadId).toBe(5);
		});

		it("returns null for non-message update", async () => {
			const body = { update_id: 3 };
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			expect(await adapter.parseMessage(req)).toBeNull();
		});

		it("returns null when text is missing", async () => {
			const body = {
				update_id: 4,
				message: {
					message_id: 102,
					from: { id: 42, first_name: "Test" },
					chat: { id: -1001, type: "supergroup" },
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			expect(await adapter.parseMessage(req)).toBeNull();
		});

		it("returns null when from is missing", async () => {
			const body = {
				update_id: 5,
				message: {
					message_id: 103,
					chat: { id: -1001, type: "supergroup" },
					text: "anonymous",
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			expect(await adapter.parseMessage(req)).toBeNull();
		});

		it("extracts photo attachment", async () => {
			const body = {
				update_id: 6,
				message: {
					message_id: 104,
					from: { id: 42, first_name: "Test" },
					chat: { id: -1001, type: "supergroup" },
					text: "photo caption",
					photo: [
						{
							file_id: "small",
							file_unique_id: "s1",
							width: 90,
							height: 90,
						},
						{
							file_id: "large",
							file_unique_id: "l1",
							width: 800,
							height: 600,
						},
					],
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const msg = await adapter.parseMessage(req);
			expect(msg).not.toBeNull();
			expect(msg?.attachments).toEqual([{ type: "photo", fileId: "large" }]);
		});
	});
});
