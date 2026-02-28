import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import "../../src/index";

describe("POST /telegram/webhook", () => {
	it("returns 401 when secret token is missing", async () => {
		const response = await SELF.fetch("http://localhost/telegram/webhook", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ update_id: 1 }),
		});
		expect(response.status).toBe(401);
	});

	it("returns 401 when secret token is invalid", async () => {
		const response = await SELF.fetch("http://localhost/telegram/webhook", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-telegram-bot-api-secret-token": "wrong-secret",
			},
			body: JSON.stringify({ update_id: 1 }),
		});
		expect(response.status).toBe(401);
	});

	it("returns 200 for non-message update", async () => {
		const response = await SELF.fetch("http://localhost/telegram/webhook", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-telegram-bot-api-secret-token": "test-webhook-secret",
			},
			body: JSON.stringify({ update_id: 1 }),
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});

	it("returns 200 and silently ignores non-allowlisted user", async () => {
		const response = await SELF.fetch("http://localhost/telegram/webhook", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-telegram-bot-api-secret-token": "test-webhook-secret",
			},
			body: JSON.stringify({
				update_id: 1,
				message: {
					message_id: 100,
					from: { id: 999, first_name: "Stranger" },
					chat: { id: -1001, type: "supergroup" },
					text: "hello",
				},
			}),
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});
});
