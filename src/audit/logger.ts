import { nanoid } from "nanoid";
import type { createDb } from "../db";
import { auditLogs } from "../db/schema";

type Db = ReturnType<typeof createDb>;

const INPUT_SUMMARY_MAX_LENGTH = 200;

export interface LogLLMCallParams {
	chatId: string;
	model: string;
	promptTokens: number;
	completionTokens: number;
	durationMs: number;
}

export interface LogToolExecutionParams {
	chatId: string;
	toolName: string;
	status: "success" | "error";
	input: unknown;
	durationMs: number;
}

function truncate(value: string, maxLength: number): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 3)}...`;
}

function safeStringify(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return "[Unserializable input]";
	}
}

export async function logLLMCall(
	db: Db,
	params: LogLLMCallParams,
): Promise<void> {
	try {
		await db.insert(auditLogs).values({
			id: nanoid(),
			type: "llm_call",
			chatId: params.chatId,
			metadata: JSON.stringify({
				model: params.model,
				promptTokens: params.promptTokens,
				completionTokens: params.completionTokens,
				durationMs: params.durationMs,
			}),
			createdAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Failed to log LLM call:", error);
	}
}

export async function logToolExecution(
	db: Db,
	params: LogToolExecutionParams,
): Promise<void> {
	try {
		const inputSummary = truncate(
			safeStringify(params.input),
			INPUT_SUMMARY_MAX_LENGTH,
		);
		await db.insert(auditLogs).values({
			id: nanoid(),
			type: "tool_execution",
			chatId: params.chatId,
			metadata: JSON.stringify({
				toolName: params.toolName,
				status: params.status,
				inputSummary,
				durationMs: params.durationMs,
			}),
			createdAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Failed to log tool execution:", error);
	}
}
