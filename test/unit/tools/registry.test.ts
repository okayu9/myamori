import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../../../src/tools/registry";
import type { ToolDefinition } from "../../../src/tools/types";
import { defineTool } from "../../../src/tools/types";

const testSchema = z.object({ value: z.string() });

function createTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
	return {
		...defineTool({
			name: "test-tool",
			description: "A test tool",
			inputSchema: testSchema,
			riskLevel: "low",
			execute: async (input) => `result: ${input.value}`,
		}),
		...overrides,
	};
}

const execOptions = {
	toolCallId: "test",
	messages: [] as never[],
	abortSignal: AbortSignal.timeout(5000),
};

describe("ToolRegistry", () => {
	it("registers and retrieves tools", () => {
		const registry = new ToolRegistry();
		registry.register(createTool({ name: "my-tool" }));

		const all = registry.getAll();
		expect(all).toHaveLength(1);
		expect(all[0]?.name).toBe("my-tool");
	});

	it("returns empty array when no tools registered", () => {
		const registry = new ToolRegistry();
		expect(registry.getAll()).toEqual([]);
	});

	it("overwrites tool with same name", () => {
		const registry = new ToolRegistry();
		registry.register(createTool({ name: "dup", description: "first" }));
		registry.register(createTool({ name: "dup", description: "second" }));

		const all = registry.getAll();
		expect(all).toHaveLength(1);
		expect(all[0]?.description).toBe("second");
	});

	it("converts to AI SDK tools format", () => {
		const registry = new ToolRegistry();
		registry.register(createTool({ name: "alpha" }));
		registry.register(createTool({ name: "beta" }));

		const sdkTools = registry.toAISDKTools();
		expect(Object.keys(sdkTools)).toEqual(["alpha", "beta"]);
		expect(sdkTools.alpha).toBeDefined();
		expect(sdkTools.beta).toBeDefined();
	});

	describe("risk-level gating", () => {
		it("executes low-risk tools directly", async () => {
			const registry = new ToolRegistry();
			registry.register(createTool({ name: "low-tool", riskLevel: "low" }));

			const sdkTools = registry.toAISDKTools();
			const execute = sdkTools["low-tool"]?.execute;
			expect(execute).toBeDefined();

			const result = await execute?.({ value: "hello" }, execOptions);
			expect(result).toBe("result: hello");
		});

		it("executes medium-risk tools directly", async () => {
			const registry = new ToolRegistry();
			registry.register(
				createTool({ name: "medium-tool", riskLevel: "medium" }),
			);

			const sdkTools = registry.toAISDKTools();
			const execute = sdkTools["medium-tool"]?.execute;
			expect(execute).toBeDefined();

			const result = await execute?.({ value: "test" }, execOptions);
			expect(result).toBe("result: test");
		});

		it("throws error for high-risk tools", async () => {
			const registry = new ToolRegistry();
			registry.register(createTool({ name: "danger-tool", riskLevel: "high" }));

			const sdkTools = registry.toAISDKTools();
			const execute = sdkTools["danger-tool"]?.execute;
			expect(execute).toBeDefined();

			await expect(execute?.({ value: "x" }, execOptions)).rejects.toThrow(
				/requires approval/,
			);
		});
	});
});
