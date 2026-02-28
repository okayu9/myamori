import { type Tool, tool } from "ai";
import type { ToolDefinition } from "./types";

export class ToolRegistry {
	private tools = new Map<string, ToolDefinition>();

	register(definition: ToolDefinition): void {
		if (this.tools.has(definition.name)) {
			throw new Error(`Duplicate tool registration: ${definition.name}`);
		}
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
				"This action requires approval which is not yet implemented",
			);
		}
		return await def.execute(input);
	};
}
