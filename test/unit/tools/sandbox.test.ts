import { describe, expect, it, vi } from "vitest";

vi.mock("@cloudflare/sandbox", () => ({
	getSandbox: vi.fn(),
}));

// Dynamic import after mock setup to avoid module resolution issues
const { getSandbox } = await import("@cloudflare/sandbox");
const { createSandboxTool } = await import("../../../src/tools/sandbox");

const mockGetSandbox = vi.mocked(getSandbox);

function createMockSandbox(runCodeResult: unknown) {
	return {
		createCodeContext: vi.fn().mockResolvedValue({ id: "ctx-123" }),
		runCode: vi.fn().mockResolvedValue(runCodeResult),
	};
}

describe("sandbox tool", () => {
	it("has correct metadata", () => {
		const tool = createSandboxTool(
			{} as DurableObjectNamespace,
			"chat-1",
		);
		expect(tool.name).toBe("execute_code");
		expect(tool.riskLevel).toBe("low");
	});

	it("executes python code successfully", async () => {
		const mockSandbox = createMockSandbox({
			results: [{ type: "text/plain", text: "42" }],
			logs: { stdout: ["42"], stderr: [] },
			error: null,
		});
		mockGetSandbox.mockReturnValue(mockSandbox as never);

		const tool = createSandboxTool(
			{} as DurableObjectNamespace,
			"chat-1",
		);
		const result = (await tool.execute({
			language: "python",
			code: "print(6 * 7)",
		})) as { success: boolean; results: unknown[] };

		expect(result.success).toBe(true);
		expect(result.results).toEqual([{ type: "text/plain", text: "42" }]);
		expect(mockSandbox.createCodeContext).toHaveBeenCalledWith({
			language: "python",
		});
	});

	it("returns error on code failure", async () => {
		const mockSandbox = createMockSandbox({
			results: [],
			logs: { stdout: [], stderr: [] },
			error: {
				name: "ZeroDivisionError",
				message: "division by zero",
				traceback: [],
			},
		});
		mockGetSandbox.mockReturnValue(mockSandbox as never);

		const tool = createSandboxTool(
			{} as DurableObjectNamespace,
			"chat-1",
		);
		const result = (await tool.execute({
			language: "python",
			code: "1/0",
		})) as { success: boolean; error: string };

		expect(result.success).toBe(false);
		expect(result.error).toBe("ZeroDivisionError: division by zero");
	});

	it("uses chatId-scoped sandbox instance", async () => {
		const mockSandbox = createMockSandbox({
			results: [],
			logs: { stdout: [], stderr: [] },
			error: null,
		});
		mockGetSandbox.mockReturnValue(mockSandbox as never);

		const ns = {} as DurableObjectNamespace;
		const tool = createSandboxTool(ns, "chat-42");
		await tool.execute({ language: "javascript", code: "1+1" });

		expect(mockGetSandbox).toHaveBeenCalledWith(ns, "sandbox-chat-42");
	});
});
