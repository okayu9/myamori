import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export async function summarizeTurn(
	anthropic: AnthropicProvider,
	model: string,
	userMessage: string,
	assistantResponse: string,
	options?: {
		generate?: typeof generateText;
	},
): Promise<string> {
	const generate = options?.generate ?? generateText;

	const prompt = [
		"Summarize the following conversation turn in a single concise paragraph.",
		"Capture the key facts, decisions, and context.",
		"Write in the same language as the conversation.",
		"",
		`User: ${userMessage}`,
		"",
		`Assistant: ${assistantResponse}`,
	].join("\n");

	const result = await generate({
		model: anthropic(model),
		maxOutputTokens: 150,
		messages: [{ role: "user", content: prompt }],
	});

	return result.text.trim();
}
