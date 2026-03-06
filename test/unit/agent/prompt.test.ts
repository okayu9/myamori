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

	it("includes memories section when memories are provided", () => {
		const prompt = buildSystemPrompt(undefined, [
			{ summary: "User prefers dark mode", score: 0.9 },
			{ summary: "User lives in Tokyo", score: 0.8 },
		]);
		expect(prompt).toContain("## Relevant Memories");
		expect(prompt).toContain("User prefers dark mode");
		expect(prompt).toContain("User lives in Tokyo");
	});

	it("does not include memories section when no memories", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).not.toContain("Relevant Memories");
	});

	it("does not include memories section for empty array", () => {
		const prompt = buildSystemPrompt(undefined, []);
		expect(prompt).not.toContain("Relevant Memories");
	});

	it("shows only UTC when no timezone is provided", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
		expect(prompt).not.toContain("Local (");
	});

	it("shows both UTC and local time when timezone is provided", () => {
		const prompt = buildSystemPrompt(undefined, undefined, "Asia/Tokyo");
		expect(prompt).toContain("UTC:");
		expect(prompt).toContain("Local (Asia/Tokyo):");
	});

	it("shows only UTC when timezone is UTC", () => {
		const prompt = buildSystemPrompt(undefined, undefined, "UTC");
		expect(prompt).not.toContain("Local (");
	});

	it("falls back to UTC for invalid timezone", () => {
		const prompt = buildSystemPrompt(undefined, undefined, "Invalid/Zone");
		expect(prompt).not.toContain("Local (");
		expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
	});

	it("includes cron UTC instruction", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).toContain("Cron expressions are always in UTC");
	});

	it("includes approval status section when approvals provided", () => {
		const prompt = buildSystemPrompt(undefined, undefined, undefined, [
			{
				toolName: "create_event",
				toolInput: '{"title":"Meeting"}',
				status: "pending",
				createdAt: "2026-01-01T00:00:00.000Z",
			},
		]);
		expect(prompt).toContain("Recent Approval Status");
		expect(prompt).toContain("PENDING: create_event");
	});

	it("omits approval section when no approvals", () => {
		const prompt = buildSystemPrompt();
		expect(prompt).not.toContain("Recent Approval Status");
	});

	it("omits approval section for empty array", () => {
		const prompt = buildSystemPrompt(undefined, undefined, undefined, []);
		expect(prompt).not.toContain("Recent Approval Status");
	});

	it("shows correct labels for each approval status", () => {
		const prompt = buildSystemPrompt(undefined, undefined, undefined, [
			{ toolName: "a", toolInput: "{}", status: "approved", createdAt: "" },
			{ toolName: "b", toolInput: "{}", status: "rejected", createdAt: "" },
			{ toolName: "c", toolInput: "{}", status: "expired", createdAt: "" },
		]);
		expect(prompt).toContain("APPROVED: a");
		expect(prompt).toContain("REJECTED: b");
		expect(prompt).toContain("EXPIRED: c");
	});
});
