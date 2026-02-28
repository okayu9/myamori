import { Hono } from "hono";
import type { AgentWorkflowParams } from "./agent/workflow";
import { getApproval, resolveApproval } from "./approval/handler";
import { logToolExecution } from "./audit/logger";
import { TelegramAdapter } from "./channels/telegram";
import { telegramUpdateSchema } from "./channels/telegram-schema";
import { createDb } from "./db";
import { ToolRegistry } from "./tools/registry";
import { createWebSearchTool } from "./tools/web-search";

type Bindings = {
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_WEBHOOK_SECRET: string;
	ALLOWED_USER_IDS: string;
	ANTHROPIC_API_KEY: string;
	ANTHROPIC_MODEL?: string;
	TAVILY_API_KEY?: string;
	AGENT_WORKFLOW: Workflow<AgentWorkflowParams>;
	DB: D1Database;
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

	try {
		const registry = buildToolRegistry(env);
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
			input: approval.toolInput,
			durationMs: 0,
		});
		await adapter.sendReply(
			approval.chatId,
			`❌ ${approval.toolName} failed: ${message}`,
			approval.threadId ?? undefined,
		);
	}
}

function buildToolRegistry(env: Bindings): ToolRegistry {
	const registry = new ToolRegistry();
	if (env.TAVILY_API_KEY?.trim()) {
		registry.register(createWebSearchTool(env.TAVILY_API_KEY));
	}
	return registry;
}

export default app;
export { AgentWorkflow } from "./agent/workflow";
