export async function embedText(ai: Ai, text: string): Promise<number[]> {
	const result = await ai.run("@cf/baai/bge-m3", { text: [text] });
	const data = "data" in result ? result.data : undefined;
	const vector = data?.[0];
	if (!vector) {
		throw new Error("No embedding returned from Workers AI");
	}
	return vector;
}
