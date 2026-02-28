import { type Tool, tool } from "ai";
import type { ToolDefinition } from "./types";

export class ToolRegistry {
	private tools = new Map<string, ToolDefinition>();

	register(definition: ToolDefinition): void {
		this.tools.set(definition.name, definition);
	}

	getAll(): ToolDefinition[] {
		return [...this.tools.values()];
	}

	toAISDKTools(): Record<string, Tool> {
		const result: Record<string, Tool> = {};
		for (const def of this.tools.values()) {
			result[def.name] = tool<unknown, unknown>({
				description: def.description,
				inputSchema: def.inputSchema,
				execute: createGatedExecute(def),
			});
		}
		return result;
	}
}

function createGatedExecute(def: ToolDefinition) {
	return async (input: unknown) => {
		if (def.riskLevel === "high") {
			throw new Error(
				`Tool "${def.name}" requires approval which is not yet implemented. Please inform the user that this action cannot be performed yet.`,
			);
		}
		return await def.execute(input);
	};
}
