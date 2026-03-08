import { getSandbox, type Sandbox } from "@cloudflare/sandbox";
import { z } from "zod";
import type { ToolDefinition } from "./types";
import { defineTool } from "./types";

export function createSandboxTool(
	sandboxNamespace: DurableObjectNamespace<Sandbox>,
	chatId: string,
): ToolDefinition {
	return defineTool({
		name: "execute_code",
		description:
			"Execute Python or JavaScript code in a secure sandbox. Use for calculations, data analysis, string processing, etc. Variables persist across executions within the same conversation. Available Python packages: numpy, pandas, matplotlib, scipy.",
		inputSchema: z.object({
			language: z
				.enum(["python", "javascript"])
				.default("python")
				.describe("Programming language to execute"),
			code: z.string().describe("Code to execute"),
		}),
		riskLevel: "low",
		execute: async (input) => {
			const sandbox = getSandbox(sandboxNamespace, `sandbox-${chatId}`);
			const context = await sandbox.createCodeContext({
				language: input.language,
			});
			const result = await sandbox.runCode(input.code, { context });

			if (result.error) {
				return {
					success: false,
					error: `${result.error.name}: ${result.error.message}`,
					logs: result.logs,
				};
			}
			return {
				success: true,
				results: result.results,
				logs: result.logs,
			};
		},
	});
}
