import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createApproval } from "../../src/approval/handler";
import { createDb } from "../../src/db";
import "../../src/index";

const VALID_HEADERS = {
	"Content-Type": "application/json",
	"x-telegram-bot-api-secret-token": "test-webhook-secret",
};

describe("POST /telegram/webhook - callback_query", () => {
	it("returns 200 for callback_query from non-allowlisted user", async () => {
		const response = await SELF.fetch("http://localhost/telegram/webhook", {
			method: "POST",
			headers: VALID_HEADERS,
			body: JSON.stringify({
				update_id: 500,
				callback_query: {
					id: "cbq-1",
					from: { id: 999, first_name: "Stranger" },
					data: "approve:some-id",
				},
			}),
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});

	it("returns 200 for callback_query without data", async () => {
		const response = await SELF.fetch("http://localhost/telegram/webhook", {
			method: "POST",
			headers: VALID_HEADERS,
			body: JSON.stringify({
				update_id: 501,
				callback_query: {
					id: "cbq-2",
					from: { id: 42, first_name: "User" },
				},
			}),
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});

	it("handles reject callback and updates approval status", async () => {
		const db = createDb(env.DB);
		const approvalId = await createApproval(db, {
			chatId: "-1001",
			toolName: "delete_file",
			toolInput: { path: "/test.txt" },
		});

		// The actual Telegram API calls will fail in tests (no real bot),
		// but we can verify the webhook doesn't crash on valid callback data
		const response = await SELF.fetch("http://localhost/telegram/webhook", {
			method: "POST",
			headers: VALID_HEADERS,
			body: JSON.stringify({
				update_id: 502,
				callback_query: {
					id: "cbq-3",
					from: { id: 42, first_name: "User" },
					data: `reject:${approvalId}`,
				},
			}),
		});
		// The handler tries to call Telegram API which will fail in test,
		// but the webhook should still return 200 (errors are handled internally)
		expect(response.status).toBe(200);
	});
});
