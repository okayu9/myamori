import { Hono } from "hono";
import type { AgentWorkflowParams } from "./agent/workflow";
import { TelegramAdapter } from "./channels/telegram";

type Bindings = {
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_WEBHOOK_SECRET: string;
	ALLOWED_USER_IDS: string;
	ANTHROPIC_API_KEY: string;
	ANTHROPIC_MODEL?: string;
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

	const message = await adapter.parseMessage(c.req.raw);
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
			botToken: c.env.TELEGRAM_BOT_TOKEN,
		},
	});

	return c.json({ ok: true });
});

export default app;
export { AgentWorkflow } from "./agent/workflow";
