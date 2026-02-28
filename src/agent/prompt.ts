import type { ToolDefinition } from "../tools/types";

export function buildSystemPrompt(tools?: ToolDefinition[]): string {
	const now = new Date().toISOString();
	const toolsSection = formatToolsSection(tools);
	const hasMediumRisk = tools?.some((t) => t.riskLevel === "medium") ?? false;

	return `You are Myamori, a personal AI assistant.

## Current Date/Time
${now}

## Available Tools
${toolsSection}

## Instructions
- Respond concisely and helpfully.
- If the user's message is in a specific language, respond in the same language.
${hasMediumRisk ? "- When you use a medium-risk tool, always report the action you took in your reply to the user.\n" : ""}`;
}

function formatToolsSection(tools?: ToolDefinition[]): string {
	if (!tools || tools.length === 0) {
		return "No tools are currently available.";
	}
	return tools
		.map((t) => {
			const riskNote =
				t.riskLevel === "high"
					? " (requires approval)"
					: ` (risk: ${t.riskLevel})`;
			return `- ${t.name}: ${t.description}${riskNote}`;
		})
		.join("\n");
}
