import { z } from "zod";
import { defineTool } from "./types";

const inputSchema = z.object({
	query: z.string().min(1).describe("The search query"),
});

interface TavilyResult {
	title: string;
	url: string;
	content: string;
}

interface TavilyResponse {
	answer?: string;
	results: TavilyResult[];
}

export function createWebSearchTool(apiKey: string) {
	return defineTool({
		name: "web_search",
		description:
			"Search the web for information. Returns an answer summary and up to 5 result snippets with titles, URLs, and content.",
		inputSchema,
		riskLevel: "low",
		execute: async (input) => {
			const response = await fetch("https://api.tavily.com/search", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					api_key: apiKey,
					query: input.query,
					max_results: 5,
					include_answer: "advanced",
				}),
				signal: AbortSignal.timeout(10_000),
			});

			if (!response.ok) {
				throw new Error(
					`Tavily API error: ${response.status} ${response.statusText}`,
				);
			}

			const data: TavilyResponse = await response.json();

			return {
				answer: data.answer ?? null,
				results: data.results.map((r) => ({
					title: r.title,
					url: r.url,
					snippet: r.content,
				})),
			};
		},
	});
}
