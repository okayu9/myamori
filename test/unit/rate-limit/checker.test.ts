import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../../../src/rate-limit/checker";

describe("checkRateLimit", () => {
	const WINDOW_MS = 60_000;

	it("allows the first message in a window", async () => {
		const result = await checkRateLimit(
			env.RATE_LIMIT_KV,
			"user-first",
			5,
			WINDOW_MS,
		);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(4);
	});

	it("allows messages up to the limit", async () => {
		const max = 3;
		const userId = "user-limit";

		const r1 = await checkRateLimit(env.RATE_LIMIT_KV, userId, max, WINDOW_MS);
		expect(r1.allowed).toBe(true);
		expect(r1.remaining).toBe(2);

		const r2 = await checkRateLimit(env.RATE_LIMIT_KV, userId, max, WINDOW_MS);
		expect(r2.allowed).toBe(true);
		expect(r2.remaining).toBe(1);

		const r3 = await checkRateLimit(env.RATE_LIMIT_KV, userId, max, WINDOW_MS);
		expect(r3.allowed).toBe(true);
		expect(r3.remaining).toBe(0);
	});

	it("rejects messages that exceed the limit", async () => {
		const max = 2;
		const userId = "user-exceed";

		await checkRateLimit(env.RATE_LIMIT_KV, userId, max, WINDOW_MS);
		await checkRateLimit(env.RATE_LIMIT_KV, userId, max, WINDOW_MS);

		const result = await checkRateLimit(
			env.RATE_LIMIT_KV,
			userId,
			max,
			WINDOW_MS,
		);
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it("allows messages again in a different window", async () => {
		const max = 1;

		// Use different user IDs to simulate different windows.
		// Window key = Math.floor(Date.now() / windowMs), so using a
		// different windowMs changes the key even at the same timestamp.
		const userId = "user-window-a";

		const r1 = await checkRateLimit(env.RATE_LIMIT_KV, userId, max, WINDOW_MS);
		expect(r1.allowed).toBe(true);

		const r2 = await checkRateLimit(env.RATE_LIMIT_KV, userId, max, WINDOW_MS);
		expect(r2.allowed).toBe(false);

		// A different window size produces a different KV key,
		// simulating that the window has rolled over.
		const differentWindow = WINDOW_MS + 1;
		const r3 = await checkRateLimit(
			env.RATE_LIMIT_KV,
			userId,
			max,
			differentWindow,
		);
		expect(r3.allowed).toBe(true);
	});

	it("isolates rate limits per user", async () => {
		const max = 1;

		await checkRateLimit(env.RATE_LIMIT_KV, "user-a", max, WINDOW_MS);
		const rejected = await checkRateLimit(
			env.RATE_LIMIT_KV,
			"user-a",
			max,
			WINDOW_MS,
		);
		expect(rejected.allowed).toBe(false);

		const otherUser = await checkRateLimit(
			env.RATE_LIMIT_KV,
			"user-b",
			max,
			WINDOW_MS,
		);
		expect(otherUser.allowed).toBe(true);
	});
});
