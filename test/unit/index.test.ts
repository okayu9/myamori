import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import "../../src/index";

describe("Worker", () => {
	it("GET / returns 200", async () => {
		const response = await SELF.fetch("http://localhost/");
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("OK");
	});
});
