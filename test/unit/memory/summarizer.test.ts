import { describe, expect, it } from "vitest";
import { summarizeTurn } from "../../../src/memory/summarizer";

function createMockAnthropic() {
	return ((model: string) => model) as unknown as Parameters<
		typeof summarizeTurn
	>[0];
}

describe("summarizeTurn", () => {
	it("returns trimmed summary from LLM", async () => {
		const anthropic = createMockAnthropic();
		const mockGenerate = async () => ({
			text: "  User asked about the weather and was told it would rain.  ",
			usage: { inputTokens: 10, outputTokens: 20 },
		});

		const result = await summarizeTurn(
			anthropic,
			"claude-haiku-4-5",
			"What's the weather?",
			"It will rain tomorrow.",
			{ generate: mockGenerate as never },
		);

		expect(result).toBe(
			"User asked about the weather and was told it would rain.",
		);
	});

	it("includes user message and assistant response in prompt", async () => {
		const anthropic = createMockAnthropic();
		let capturedMessages: unknown;
		const mockGenerate = async (opts: { messages: unknown }) => {
			capturedMessages = opts.messages;
			return { text: "Summary", usage: { inputTokens: 10, outputTokens: 5 } };
		};

		await summarizeTurn(anthropic, "claude-haiku-4-5", "Hello", "Hi there!", {
			generate: mockGenerate as never,
		});

		const messages = capturedMessages as { role: string; content: string }[];
		expect(messages).toHaveLength(1);
		expect(messages[0]?.content).toContain("Hello");
		expect(messages[0]?.content).toContain("Hi there!");
	});

	it("sets maxOutputTokens to 150", async () => {
		const anthropic = createMockAnthropic();
		let capturedMaxTokens: number | undefined;
		const mockGenerate = async (opts: { maxOutputTokens?: number }) => {
			capturedMaxTokens = opts.maxOutputTokens;
			return { text: "Summary", usage: { inputTokens: 10, outputTokens: 5 } };
		};

		await summarizeTurn(
			anthropic,
			"claude-haiku-4-5",
			"User msg",
			"Assistant msg",
			{ generate: mockGenerate as never },
		);

		expect(capturedMaxTokens).toBe(150);
	});
});
