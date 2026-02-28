import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebSearchTool } from "../../../src/tools/web-search";

const mockTavilyResponse = {
	answer: "TypeScript is a typed superset of JavaScript.",
	results: [
		{
			title: "TypeScript Official Site",
			url: "https://www.typescriptlang.org/",
			content:
				"TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
		},
		{
			title: "TypeScript on GitHub",
			url: "https://github.com/microsoft/TypeScript",
			content:
				"TypeScript is a superset of JavaScript that compiles to clean JavaScript output.",
		},
	],
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createWebSearchTool", () => {
	it("returns a tool with correct metadata", () => {
		const tool = createWebSearchTool("test-key");

		expect(tool.name).toBe("web_search");
		expect(tool.riskLevel).toBe("low");
		expect(tool.description).toBeTruthy();
	});

	it("validates input requires a non-empty query", () => {
		const tool = createWebSearchTool("test-key");

		const validResult = tool.inputSchema.safeParse({ query: "hello" });
		expect(validResult.success).toBe(true);

		const emptyResult = tool.inputSchema.safeParse({ query: "" });
		expect(emptyResult.success).toBe(false);

		const missingResult = tool.inputSchema.safeParse({});
		expect(missingResult.success).toBe(false);
	});

	it("rejects whitespace-only queries", async () => {
		const tool = createWebSearchTool("key");

		await expect(tool.execute({ query: "   " })).rejects.toThrow(
			/Query must not be empty/,
		);
	});

	it("calls Tavily API and returns structured results", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify(mockTavilyResponse), { status: 200 }),
		);

		const tool = createWebSearchTool("my-api-key");
		const result = await tool.execute({ query: "what is typescript" });

		expect(globalThis.fetch).toHaveBeenCalledOnce();
		const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0] as [
			string,
			RequestInit,
		];
		expect(url).toBe("https://api.tavily.com/search");
		expect(options.method).toBe("POST");

		const body = JSON.parse(options.body as string);
		expect(body.api_key).toBe("my-api-key");
		expect(body.query).toBe("what is typescript");
		expect(body.max_results).toBe(5);
		expect(body.include_answer).toBe("advanced");

		expect(result).toEqual({
			answer: "TypeScript is a typed superset of JavaScript.",
			results: [
				{
					title: "TypeScript Official Site",
					url: "https://www.typescriptlang.org/",
					snippet:
						"TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
				},
				{
					title: "TypeScript on GitHub",
					url: "https://github.com/microsoft/TypeScript",
					snippet:
						"TypeScript is a superset of JavaScript that compiles to clean JavaScript output.",
				},
			],
		});
	});

	it("returns null answer when Tavily omits it", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ results: [] }), { status: 200 }),
		);

		const tool = createWebSearchTool("key");
		const result = (await tool.execute({ query: "test" })) as {
			answer: string | null;
			results: unknown[];
		};

		expect(result.answer).toBeNull();
		expect(result.results).toEqual([]);
	});

	it("handles malformed Tavily response gracefully", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
		);

		const tool = createWebSearchTool("key");
		const result = (await tool.execute({ query: "test" })) as {
			answer: string | null;
			results: unknown[];
		};

		expect(result.answer).toBeNull();
		expect(result.results).toEqual([]);
	});

	it("throws on non-OK HTTP response", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response("Unauthorized", {
				status: 401,
				statusText: "Unauthorized",
			}),
		);

		const tool = createWebSearchTool("bad-key");

		await expect(tool.execute({ query: "test" })).rejects.toThrow(
			/Tavily API error: 401/,
		);
	});
});
