import type { z } from "zod";

export type RiskLevel = "low" | "medium" | "high";

export interface ToolDefinition {
	name: string;
	description: string;
	inputSchema: z.ZodType;
	riskLevel: RiskLevel;
	execute: (input: unknown) => Promise<unknown>;
}

export function defineTool<T>(config: {
	name: string;
	description: string;
	inputSchema: z.ZodType<T>;
	riskLevel: RiskLevel;
	execute: (input: T) => Promise<unknown>;
}): ToolDefinition {
	return config as ToolDefinition;
}
