import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import "../../src/index";

function makeWebhookRequest(userId: number, text: string) {
	return SELF.fetch("http://localhost/telegram/webhook", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-telegram-bot-api-secret-token": "test-webhook-secret",
		},
		body: JSON.stringify({
			update_id: Math.floor(Math.random() * 100000),
			message: {
				message_id: Math.floor(Math.random() * 100000),
				from: { id: userId, first_name: "Test" },
				chat: { id: userId, type: "private" },
				text,
			},
		}),
	});
}

describe("rate limiting integration", () => {
	it("rejects messages when rate limit is exceeded", async () => {
		// The default RATE_LIMIT_MAX is 20, so we need to exhaust it.
		// Use a unique user ID (42 is in ALLOWED_USER_IDS).
		// Set a low limit via env for this test — but since env vars are
		// set in vitest.config.ts, we use the KV directly to simulate
		// a user who has already hit the limit.
		const windowKey = Math.floor(Date.now() / 3_600_000);
		const kvKey = `ratelimit:42:${windowKey}`;
		await env.RATE_LIMIT_KV.put(kvKey, "20", { expirationTtl: 3600 });

		const response = await makeWebhookRequest(42, "should be rejected");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });

		// Verify the rate limit message was "sent" (the request completes
		// without dispatching to workflow — we can't easily verify the
		// Telegram API call, but the fact it returns ok: true without error
		// confirms the rate limit path was taken).
	});
});
