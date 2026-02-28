import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../../../src/agent/prompt";

describe("buildSystemPrompt", () => {
	it("includes the assistant role", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).toContain("Myamori");
	});

	it("includes current date/time in ISO 8601 format", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
	});

	it("includes tools placeholder", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).toContain("Available Tools");
		expect(prompt).toContain("No tools are currently available");
	});
});
