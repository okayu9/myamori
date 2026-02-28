import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildSystemPrompt } from "../../../src/agent/prompt";
import type { ToolDefinition } from "../../../src/tools/types";

describe("buildSystemPrompt", () => {
	it("includes the assistant role", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).toContain("Myamori");
	});

	it("includes current date/time in ISO 8601 format", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
	});

	it("shows no-tools message when no tools provided", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).toContain("Available Tools");
		expect(prompt).toContain("No tools are currently available");
	});

	it("shows no-tools message for empty array", () => {
		const prompt = buildSystemPrompt([]);
		expect(prompt).toContain("No tools are currently available");
	});

	it("renders tool descriptions with risk levels", () => {
		const tools: ToolDefinition[] = [
			{
				name: "search",
				description: "Search the web",
				inputSchema: z.object({ query: z.string() }),
				riskLevel: "low",
				execute: async () => "",
			},
			{
				name: "delete-file",
				description: "Delete a file",
				inputSchema: z.object({ path: z.string() }),
				riskLevel: "high",
				execute: async () => "",
			},
		];
		const prompt = buildSystemPrompt(tools);
		expect(prompt).toContain("- search: Search the web (risk: low)");
		expect(prompt).toContain(
			"- delete-file: Delete a file (requires approval)",
		);
		expect(prompt).not.toContain("No tools are currently available");
	});

	it("includes medium-risk reporting instruction when medium-risk tools present", () => {
		const tools: ToolDefinition[] = [
			{
				name: "send-email",
				description: "Send an email",
				inputSchema: z.object({ to: z.string() }),
				riskLevel: "medium",
				execute: async () => "",
			},
		];
		const prompt = buildSystemPrompt(tools);
		expect(prompt).toContain("medium-risk tool");
		expect(prompt).toContain("report the action");
	});

	it("does not include medium-risk instruction when no medium-risk tools", () => {
		const tools: ToolDefinition[] = [
			{
				name: "search",
				description: "Search",
				inputSchema: z.object({ q: z.string() }),
				riskLevel: "low",
				execute: async () => "",
			},
		];
		const prompt = buildSystemPrompt(tools);
		expect(prompt).not.toContain("medium-risk tool");
	});
});
