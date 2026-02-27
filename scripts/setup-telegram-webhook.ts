/**
 * Register the Telegram Bot webhook URL.
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=<token> TELEGRAM_WEBHOOK_SECRET=<secret> WEBHOOK_URL=<url> bun scripts/setup-telegram-webhook.ts
 */

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const webhookUrl = process.env.WEBHOOK_URL;

if (!botToken || !webhookSecret || !webhookUrl) {
	console.error(
		"Required env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, WEBHOOK_URL",
	);
	process.exit(1);
}

const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
const response = await fetch(url, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		url: `${webhookUrl}/telegram/webhook`,
		secret_token: webhookSecret,
	}),
});

const result = await response.json();
console.log("setWebhook result:", JSON.stringify(result, null, 2));

if (!response.ok) {
	process.exit(1);
}
