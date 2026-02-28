import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../../../src/tools/registry";
import { defineTool } from "../../../src/tools/types";

const testSchema = z.object({ value: z.string() });

const execOptions = {
	toolCallId: "test",
	messages: [] as never[],
	abortSignal: AbortSignal.timeout(5000),
};

describe("ToolRegistry onToolExecuted callback", () => {
	it("calls onToolExecuted after successful tool execution", async () => {
		const registry = new ToolRegistry();
		registry.register(
			defineTool({
				name: "safe-tool",
				description: "A low-risk tool",
				inputSchema: testSchema,
				riskLevel: "low",
				execute: async (input) => `result: ${input.value}`,
			}),
		);

		const onToolExecuted = vi.fn().mockResolvedValue(undefined);
		const sdkTools = registry.toAISDKTools({ onToolExecuted });
		const execute = sdkTools["safe-tool"]?.execute;

		await execute?.({ value: "hello" }, execOptions);

		expect(onToolExecuted).toHaveBeenCalledOnce();
		const log = onToolExecuted.mock.calls[0]?.[0];
		expect(log.toolName).toBe("safe-tool");
		expect(log.status).toBe("success");
		expect(log.input).toEqual({ value: "hello" });
		expect(log.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("calls onToolExecuted with error status on tool failure", async () => {
		const registry = new ToolRegistry();
		registry.register(
			defineTool({
				name: "failing-tool",
				description: "A tool that throws",
				inputSchema: testSchema,
				riskLevel: "low",
				execute: async () => {
					throw new Error("boom");
				},
			}),
		);

		const onToolExecuted = vi.fn().mockResolvedValue(undefined);
		const sdkTools = registry.toAISDKTools({ onToolExecuted });
		const execute = sdkTools["failing-tool"]?.execute;

		await expect(execute?.({ value: "x" }, execOptions)).rejects.toThrow(
			"boom",
		);

		expect(onToolExecuted).toHaveBeenCalledOnce();
		const log = onToolExecuted.mock.calls[0]?.[0];
		expect(log.toolName).toBe("failing-tool");
		expect(log.status).toBe("error");
	});

	it("does not break tool execution if onToolExecuted throws", async () => {
		const registry = new ToolRegistry();
		registry.register(
			defineTool({
				name: "safe-tool",
				description: "A low-risk tool",
				inputSchema: testSchema,
				riskLevel: "low",
				execute: async (input) => `result: ${input.value}`,
			}),
		);

		const onToolExecuted = vi.fn().mockRejectedValue(new Error("log failed"));
		const sdkTools = registry.toAISDKTools({ onToolExecuted });
		const execute = sdkTools["safe-tool"]?.execute;

		const result = await execute?.({ value: "hello" }, execOptions);
		expect(result).toBe("result: hello");
		expect(onToolExecuted).toHaveBeenCalledOnce();
	});
});
