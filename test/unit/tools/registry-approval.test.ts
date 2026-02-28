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

function createHighRiskTool() {
	return defineTool({
		name: "danger-tool",
		description: "A high-risk tool",
		inputSchema: testSchema,
		riskLevel: "high",
		execute: async (input) => `executed: ${input.value}`,
	});
}

describe("ToolRegistry onHighRisk callback", () => {
	it("calls onHighRisk callback for high-risk tools", async () => {
		const registry = new ToolRegistry();
		registry.register(createHighRiskTool());

		const onHighRisk = vi.fn().mockResolvedValue("Approval requested");

		const sdkTools = registry.toAISDKTools({ onHighRisk });
		const execute = sdkTools["danger-tool"]?.execute;
		expect(execute).toBeDefined();

		const result = await execute?.({ value: "test" }, execOptions);
		expect(result).toBe("Approval requested");
		expect(onHighRisk).toHaveBeenCalledWith("danger-tool", { value: "test" });
	});

	it("falls back to throwing when onHighRisk is not provided", async () => {
		const registry = new ToolRegistry();
		registry.register(createHighRiskTool());

		const sdkTools = registry.toAISDKTools();
		const execute = sdkTools["danger-tool"]?.execute;
		expect(execute).toBeDefined();

		await expect(execute?.({ value: "x" }, execOptions)).rejects.toThrow(
			/requires approval/,
		);
	});

	it("does not call onHighRisk for low-risk tools", async () => {
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

		const onHighRisk = vi.fn();

		const sdkTools = registry.toAISDKTools({ onHighRisk });
		const execute = sdkTools["safe-tool"]?.execute;
		const result = await execute?.({ value: "hello" }, execOptions);

		expect(result).toBe("result: hello");
		expect(onHighRisk).not.toHaveBeenCalled();
	});
});
