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
			const query = input.query.trim();
			if (!query) {
				throw new Error("Query must not be empty");
			}

			const response = await fetch("https://api.tavily.com/search", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					api_key: apiKey,
					query,
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

			const data = (await response.json()) as Partial<TavilyResponse>;
			const safeResults = Array.isArray(data.results) ? data.results : [];

			return {
				answer: typeof data.answer === "string" ? data.answer : null,
				results: safeResults.map((r) => ({
					title: r.title,
					url: r.url,
					snippet: r.content,
				})),
			};
		},
	});
}
