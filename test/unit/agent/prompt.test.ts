import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../../../src/agent/prompt";

describe("buildSystemPrompt", () => {
	it("includes the assistant role", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).toContain("Myamori");
	});

	it("includes current date/time in ISO 8601 format", () => {
		const before = new Date().toISOString().slice(0, 10);
		const prompt = buildSystemPrompt();
		expect(prompt).toContain(before);
	});

	it("includes tools placeholder", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).toContain("Available Tools");
		expect(prompt).toContain("No tools are currently available");
	});
});
