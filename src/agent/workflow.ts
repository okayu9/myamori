import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import { createDb } from "../db";
import { ToolRegistry } from "../tools/registry";
import { loadHistory, saveMessages } from "./history";
import { buildSystemPrompt } from "./prompt";

export interface AgentWorkflowParams {
	chatId: string;
	userMessage: string;
	threadId?: number;
}

export interface AgentWorkflowEnv {
	DB: D1Database;
	ANTHROPIC_API_KEY: string;
	ANTHROPIC_MODEL?: string;
	TELEGRAM_BOT_TOKEN: string;
}

export class AgentWorkflow extends WorkflowEntrypoint<
	AgentWorkflowEnv,
	AgentWorkflowParams
> {
	override async run(
		event: WorkflowEvent<AgentWorkflowParams>,
		step: WorkflowStep,
	) {
		const { chatId, userMessage, threadId } = event.payload;

		const history = await step.do("load-history", async () => {
			const db = createDb(this.env.DB);
			return await loadHistory(db, chatId);
		});

		let replyText: string;
		try {
			replyText = await step.do(
				"call-llm",
				{
					retries: {
						limit: 3,
						delay: "5 second",
						backoff: "exponential",
					},
					timeout: "5 minutes",
				},
				async () => {
					const anthropic = createAnthropic({
						apiKey: this.env.ANTHROPIC_API_KEY,
					});
					const model = this.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

					const registry = new ToolRegistry();
					// Tools will be registered here in future changes

					const result = await generateText({
						model: anthropic(model),
						system: buildSystemPrompt(registry.getAll()),
						messages: [
							...history.map((m) => ({
								role: m.role as "user" | "assistant",
								content: m.content,
							})),
							{ role: "user" as const, content: userMessage },
						],
						tools: registry.toAISDKTools(),
						stopWhen: stepCountIs(5),
					});

					return result.text;
				},
			);
		} catch {
			replyText =
				"Sorry, I encountered an error processing your message. Please try again later.";
		}

		await step.do("send-reply", { timeout: "30 seconds" }, async () => {
			const url = `https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
			const body: Record<string, unknown> = {
				chat_id: chatId,
				text: replyText,
			};
			if (threadId !== undefined) {
				body.message_thread_id = threadId;
			}
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(10_000),
			});
			const data: { ok: boolean; error_code?: number; description?: string } =
				await response.json();
			if (!data.ok) {
				throw new Error(
					`Telegram sendMessage failed (${data.error_code}): ${data.description}`,
				);
			}
		});

		await step.do("save-history", async () => {
			const db = createDb(this.env.DB);
			await saveMessages(db, chatId, userMessage, replyText);
		});
	}
}
