import { Hono } from "hono";
import { TelegramAdapter } from "./channels/telegram";

type Bindings = {
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_WEBHOOK_SECRET: string;
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

	c.executionCtx.waitUntil(
		adapter.sendReply(message.chatId, message.text, message.threadId),
	);

	return c.json({ ok: true });
});

export default app;
