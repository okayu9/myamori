import { describe, expect, it } from "vitest";
import { embedText } from "../../../src/memory/embedder";

function createMockAi(vectors: number[][]): Ai {
	return {
		run: async () => ({ data: vectors }),
	} as unknown as Ai;
}

describe("embedText", () => {
	it("returns the embedding vector from Workers AI", async () => {
		const fakeVector = Array.from({ length: 1024 }, (_, i) => i * 0.001);
		const ai = createMockAi([fakeVector]);

		const result = await embedText(ai, "hello world");

		expect(result).toEqual(fakeVector);
		expect(result).toHaveLength(1024);
	});

	it("passes text to Workers AI run", async () => {
		let capturedInput: unknown;
		const ai = {
			run: async (_model: string, input: unknown) => {
				capturedInput = input;
				return { data: [[0.1, 0.2]] };
			},
		} as unknown as Ai;

		await embedText(ai, "test input");

		expect(capturedInput).toEqual({ text: ["test input"] });
	});
});
