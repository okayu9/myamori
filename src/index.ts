import { Hono } from "hono";
import type { AgentWorkflowParams } from "./agent/workflow";
import { getApproval, resolveApproval } from "./approval/handler";
import { logToolExecution } from "./audit/logger";
import { TelegramAdapter } from "./channels/telegram";
import { telegramUpdateSchema } from "./channels/telegram-schema";
import { createDb } from "./db";
import { checkRateLimit } from "./rate-limit/checker";
import type { SchedulerJobMessage } from "./scheduler/handler";
import { handleScheduledEvent } from "./scheduler/handler";
import { createFileTools } from "./tools/files";
import { ToolRegistry } from "./tools/registry";
import { createSchedulerTools } from "./tools/scheduler";
import { createWebSearchTool } from "./tools/web-search";

type Bindings = {
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_WEBHOOK_SECRET: string;
	ALLOWED_USER_IDS: string;
	ANTHROPIC_API_KEY: string;
	ANTHROPIC_MODEL?: string;
	TAVILY_API_KEY?: string;
	RATE_LIMIT_MAX?: string;
	RATE_LIMIT_WINDOW_MS?: string;
	CALDAV_URL?: string;
	CALDAV_USERNAME?: string;
	CALDAV_PASSWORD?: string;
	CALDAV_CALENDAR_NAME?: string;
	FILE_BUCKET?: R2Bucket;
	SCHEDULER_QUEUE: Queue;
	AGENT_WORKFLOW: Workflow<AgentWorkflowParams>;
	DB: D1Database;
	RATE_LIMIT_KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("OK"));

app.post("/telegram/webhook", async (c) => {
	const adapter = new TelegramAdapter(
		c.env.TELEGRAM_BOT_TOKEN,
		c.env.TELEGRAM_WEBHOOK_SECRET,
	);

	if (!(await adapter.verifyRequest(c.req.raw))) {
		return c.text("Unauthorized", 401);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ ok: true });
	}
	const parsed = telegramUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ ok: true });
	}

	const update = parsed.data;

	// Handle callback queries (approval buttons)
	if (update.callback_query) {
		const cbq = update.callback_query;
		const data = cbq.data;
		if (!data) {
			return c.json({ ok: true });
		}

		const allowedIds = c.env.ALLOWED_USER_IDS.split(",").map((id) => id.trim());
		if (!allowedIds.includes(String(cbq.from.id))) {
			return c.json({ ok: true });
		}

		try {
			await handleCallbackQuery(c.env, adapter, cbq.id, data);
		} catch (error) {
			console.error("Callback query handling failed:", error);
		}
		return c.json({ ok: true });
	}

	// Handle regular messages
	const message = await adapter.parseMessage(
		new Request(c.req.url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
	);
	if (!message) {
		return c.json({ ok: true });
	}

	const allowedIds = c.env.ALLOWED_USER_IDS.split(",").map((id) => id.trim());
	if (!allowedIds.includes(message.userId)) {
		return c.json({ ok: true });
	}

	const parsedMax = c.env.RATE_LIMIT_MAX
		? Number.parseInt(c.env.RATE_LIMIT_MAX, 10)
		: 20;
	const rateLimitMax = Number.isNaN(parsedMax) ? 20 : parsedMax;
	const parsedWindow = c.env.RATE_LIMIT_WINDOW_MS
		? Number.parseInt(c.env.RATE_LIMIT_WINDOW_MS, 10)
		: 3_600_000;
	const rateLimitWindowMs = Number.isNaN(parsedWindow)
		? 3_600_000
		: parsedWindow;
	let rateLimit: { allowed: boolean; remaining: number };
	try {
		rateLimit = await checkRateLimit(
			c.env.RATE_LIMIT_KV,
			message.userId,
			rateLimitMax,
			rateLimitWindowMs,
		);
	} catch (error) {
		console.error("Rate limit check failed, allowing request:", error);
		rateLimit = { allowed: true, remaining: 0 };
	}
	if (!rateLimit.allowed) {
		try {
			await adapter.sendReply(
				message.chatId,
				"You've reached the message limit. Please try again later.",
				message.threadId ?? undefined,
			);
		} catch (error) {
			console.error("Failed to send rate limit reply:", error);
		}
		return c.json({ ok: true });
	}

	await c.env.AGENT_WORKFLOW.create({
		params: {
			chatId: message.chatId,
			userMessage: message.text,
			threadId: message.threadId,
		},
	});

	return c.json({ ok: true });
});

async function handleCallbackQuery(
	env: Bindings,
	adapter: TelegramAdapter,
	callbackQueryId: string,
	data: string,
) {
	const match = data.match(/^(approve|reject):(.+)$/);
	if (!match) {
		await adapter.answerCallbackQuery(callbackQueryId, "Unknown action");
		return;
	}

	const [, action, approvalId] = match;
	const db = createDb(env.DB);
	const approval = await getApproval(db, approvalId as string);

	if (!approval) {
		await adapter.answerCallbackQuery(callbackQueryId, "Approval not found");
		return;
	}

	const resolveAction = action === "approve" ? "approved" : "rejected";
	const result = await resolveApproval(db, approvalId as string, resolveAction);

	if (result === "expired") {
		await adapter.answerCallbackQuery(
			callbackQueryId,
			"This approval has expired",
		);
		await adapter.sendReply(
			approval.chatId,
			`⏰ Approval for ${approval.toolName} has expired.`,
			approval.threadId ?? undefined,
		);
		return;
	}

	if (result === "not_found") {
		await adapter.answerCallbackQuery(callbackQueryId, "Approval not found");
		return;
	}

	if (result === "already_resolved") {
		await adapter.answerCallbackQuery(callbackQueryId, "Already resolved");
		return;
	}

	if (action === "reject") {
		await adapter.answerCallbackQuery(callbackQueryId, "Rejected");
		await adapter.sendReply(
			approval.chatId,
			`❌ Rejected: ${approval.toolName}`,
			approval.threadId ?? undefined,
		);
		return;
	}

	// Approved — execute the tool
	await adapter.answerCallbackQuery(callbackQueryId, "Approved! Executing...");

	const registry = buildToolRegistry(
		env,
		approval.chatId,
		approval.threadId ?? undefined,
	);
	const toolDef = registry.getByName(approval.toolName);
	if (!toolDef) {
		await adapter.sendReply(
			approval.chatId,
			`❌ Error: Tool "${approval.toolName}" not found`,
			approval.threadId ?? undefined,
		);
		return;
	}

	const toolInputRaw: unknown = JSON.parse(approval.toolInput);
	const parsedInput = toolDef.inputSchema.safeParse(toolInputRaw);
	if (!parsedInput.success) {
		await adapter.sendReply(
			approval.chatId,
			`❌ Invalid stored input for ${approval.toolName}`,
			approval.threadId ?? undefined,
		);
		return;
	}

	const toolStart = Date.now();
	try {
		const toolResult = await toolDef.execute(parsedInput.data);
		await logToolExecution(db, {
			chatId: approval.chatId,
			toolName: approval.toolName,
			status: "success",
			input: parsedInput.data,
			durationMs: Date.now() - toolStart,
		});
		await adapter.sendReply(
			approval.chatId,
			`✅ ${approval.toolName} executed:\n\n${JSON.stringify(toolResult, null, 2)}`,
			approval.threadId ?? undefined,
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		await logToolExecution(db, {
			chatId: approval.chatId,
			toolName: approval.toolName,
			status: "error",
			input: parsedInput.data,
			durationMs: Date.now() - toolStart,
		});
		await adapter.sendReply(
			approval.chatId,
			`❌ ${approval.toolName} failed: ${message}`,
			approval.threadId ?? undefined,
		);
	}
}

function buildToolRegistry(
	env: Bindings,
	chatId?: string,
	threadId?: number,
): ToolRegistry {
	const registry = new ToolRegistry();
	if (env.TAVILY_API_KEY?.trim()) {
		registry.register(createWebSearchTool(env.TAVILY_API_KEY));
	}
	if (env.FILE_BUCKET) {
		for (const tool of createFileTools(env.FILE_BUCKET)) {
			registry.register(tool);
		}
	}
	if (chatId) {
		const db = createDb(env.DB);
		for (const tool of createSchedulerTools(db, chatId, threadId)) {
			registry.register(tool);
		}
	}
	return registry;
}

export default {
	fetch: app.fetch,
	async scheduled(
		_event: ScheduledEvent,
		env: Bindings,
		_ctx: ExecutionContext,
	) {
		await handleScheduledEvent({
			DB: env.DB,
			SCHEDULER_QUEUE: env.SCHEDULER_QUEUE,
		});
	},
	async queue(
		batch: MessageBatch<SchedulerJobMessage>,
		env: Bindings,
		_ctx: ExecutionContext,
	) {
		for (const msg of batch.messages) {
			const { chatId, prompt, threadId } = msg.body;
			try {
				await env.AGENT_WORKFLOW.create({
					params: {
						chatId,
						userMessage: prompt,
						threadId,
					},
				});
				msg.ack();
			} catch (error) {
				console.error(
					`Failed to process scheduled job for chat ${chatId}:`,
					error,
				);
				msg.retry();
			}
		}
	},
};
export { AgentWorkflow } from "./agent/workflow";
