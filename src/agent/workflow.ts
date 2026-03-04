import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import { createApproval } from "../approval/handler";
import { logLLMCall, logToolExecution } from "../audit/logger";
import { TelegramAdapter } from "../channels/telegram";
import { createDb } from "../db";
import { embedText } from "../memory/embedder";
import { retrieveMemories } from "../memory/retriever";
import { storeMemory } from "../memory/store";
import { summarizeTurn } from "../memory/summarizer";
import { buildToolRegistry } from "../tools/build-registry";
import { loadHistory, saveMessages } from "./history";
import { buildSystemPrompt } from "./prompt";

const ERROR_FALLBACK =
	"Sorry, I encountered an error processing your message. Please try again later.";

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
	TAVILY_API_KEY?: string;
	CALDAV_URL?: string;
	CALDAV_USERNAME?: string;
	CALDAV_PASSWORD?: string;
	CALDAV_CALENDAR_NAME?: string;
	TIMEZONE?: string;
	FILE_BUCKET?: R2Bucket;
	SCHEDULER_QUEUE?: Queue;
	VECTORIZE?: VectorizeIndex;
	AI?: Ai;
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

		let memories: { summary: string; score: number }[] = [];
		if (this.env.VECTORIZE && this.env.AI) {
			try {
				memories = await step.do("retrieve-memories", async () => {
					const db = createDb(this.env.DB);
					// biome-ignore lint/style/noNonNullAssertion: checked above
					return await retrieveMemories(this.env.VECTORIZE!, this.env.AI!, db, {
						chatId,
						query: userMessage,
					});
				});
			} catch (error) {
				console.error("Memory retrieval failed:", error);
			}
		}

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

					const registry = await buildToolRegistry(this.env, chatId, threadId);

					const llmStart = Date.now();
					const result = await generateText({
						model: anthropic(model),
						system: buildSystemPrompt(
							registry.getAll(),
							memories.length > 0 ? memories : undefined,
							this.env.TIMEZONE,
						),
						messages: [
							...history.map((m) => ({
								role: m.role as "user" | "assistant",
								content: m.content,
							})),
							{ role: "user" as const, content: userMessage },
						],
						tools: registry.toAISDKTools({
							onToolExecuted: async (log) => {
								const toolDb = createDb(this.env.DB);
								await logToolExecution(toolDb, {
									chatId,
									toolName: log.toolName,
									status: log.status,
									input: log.input,
									durationMs: log.durationMs,
								});
							},
							onHighRisk: async (toolName, input) => {
								try {
									const db = createDb(this.env.DB);
									const approvalId = await createApproval(db, {
										chatId,
										threadId,
										toolName,
										toolInput: input,
									});

									const telegram = new TelegramAdapter(
										this.env.TELEGRAM_BOT_TOKEN,
										"",
									);
									const preview = `🔒 Approval required: ${toolName}\n\nInput: ${JSON.stringify(input, null, 2)}`;
									await telegram.sendMessageWithInlineKeyboard(
										chatId,
										preview,
										[
											{
												text: "✅ Approve",
												callbackData: `approve:${approvalId}`,
											},
											{
												text: "❌ Reject",
												callbackData: `reject:${approvalId}`,
											},
										],
										threadId,
									);

									return `Approval requested for ${toolName}. The user will see an Approve/Reject button in Telegram.`;
								} catch (error) {
									console.error(
										`Failed to request approval for ${toolName}:`,
										error,
									);
									return `Unable to request approval for ${toolName} right now. Please retry.`;
								}
							},
						}),
						stopWhen: stepCountIs(5),
					});

					const llmDb = createDb(this.env.DB);
					await logLLMCall(llmDb, {
						chatId,
						model,
						promptTokens: result.usage?.inputTokens ?? 0,
						completionTokens: result.usage?.outputTokens ?? 0,
						durationMs: Date.now() - llmStart,
					});

					return result.text;
				},
			);
		} catch {
			replyText = ERROR_FALLBACK;
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

		if (
			this.env.VECTORIZE &&
			this.env.AI &&
			replyText.length >= 50 &&
			replyText !== ERROR_FALLBACK
		) {
			try {
				await step.do("memorize", async () => {
					const anthropic = createAnthropic({
						apiKey: this.env.ANTHROPIC_API_KEY,
					});
					const model = this.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

					const summary = await summarizeTurn(
						anthropic,
						model,
						userMessage,
						replyText,
					);

					// biome-ignore lint/style/noNonNullAssertion: checked above
					const vector = await embedText(this.env.AI!, summary);

					const db = createDb(this.env.DB);
					// biome-ignore lint/style/noNonNullAssertion: checked above
					await storeMemory(this.env.VECTORIZE!, db, {
						chatId,
						summary,
						vector,
					});
				});
			} catch (error) {
				console.error("Memorization failed:", error);
			}
		}
	}
}
