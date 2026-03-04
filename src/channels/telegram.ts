import { type TelegramMessage, telegramUpdateSchema } from "./telegram-schema";
import type { Attachment, ChannelAdapter, IncomingMessage } from "./types";

export class TelegramAdapter implements ChannelAdapter {
	constructor(
		private readonly botToken: string,
		private readonly webhookSecret: string,
	) {}

	async verifyRequest(req: Request): Promise<boolean> {
		const token = req.headers.get("x-telegram-bot-api-secret-token");
		return token === this.webhookSecret;
	}

	async parseMessage(req: Request): Promise<IncomingMessage | null> {
		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return null;
		}
		const result = telegramUpdateSchema.safeParse(body);
		if (!result.success) return null;

		const update = result.data;
		if (!update.message) return null;

		const msg = update.message;
		if (!msg.from) return null;
		const text = msg.text ?? msg.caption;
		if (!text) return null;

		return {
			userId: String(msg.from.id),
			text,
			chatId: String(msg.chat.id),
			threadId: msg.message_thread_id,
			attachments: extractAttachments(msg),
			raw: body,
		};
	}

	async sendReply(
		chatId: string,
		text: string,
		threadId?: number,
	): Promise<void> {
		await this.sendTelegramMessage({ chat_id: chatId, text }, threadId);
	}

	async sendMessageWithInlineKeyboard(
		chatId: string,
		text: string,
		buttons: Array<{ text: string; callbackData: string }>,
		threadId?: number,
	): Promise<void> {
		await this.sendTelegramMessage(
			{
				chat_id: chatId,
				text,
				reply_markup: {
					inline_keyboard: [
						buttons.map((b) => ({
							text: b.text,
							callback_data: b.callbackData,
						})),
					],
				},
			},
			threadId,
		);
	}

	private async sendTelegramMessage(
		body: Record<string, unknown>,
		threadId?: number,
	): Promise<void> {
		const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
		const baseBody =
			threadId !== undefined ? { ...body, message_thread_id: threadId } : body;

		// Convert standard Markdown to Telegram HTML and try HTML parse_mode
		const htmlText = markdownToTelegramHtml(String(baseBody.text));
		const htmlBody = { ...baseBody, text: htmlText, parse_mode: "HTML" };
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(htmlBody),
		});
		const data: { ok: boolean; error_code?: number; description?: string } =
			await response.json();

		if (data.ok) return;

		// If HTML parsing failed, retry as plain text
		if (data.error_code === 400) {
			const plainResponse = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(baseBody),
			});
			const plainData: {
				ok: boolean;
				error_code?: number;
				description?: string;
			} = await plainResponse.json();
			if (!plainData.ok) {
				throw new Error(
					`Telegram sendMessage failed (${plainData.error_code}): ${plainData.description}`,
				);
			}
			return;
		}

		throw new Error(
			`Telegram sendMessage failed (${data.error_code}): ${data.description}`,
		);
	}

	async answerCallbackQuery(
		callbackQueryId: string,
		text?: string,
	): Promise<void> {
		const url = `https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`;
		const body: Record<string, unknown> = {
			callback_query_id: callbackQueryId,
		};
		if (text !== undefined) {
			body.text = text;
		}
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const data: { ok: boolean; error_code?: number; description?: string } =
			await response.json();
		if (!data.ok) {
			throw new Error(
				`Telegram answerCallbackQuery failed (${data.error_code}): ${data.description}`,
			);
		}
	}
}

/**
 * Convert standard Markdown to Telegram-compatible HTML.
 * Handles: bold, italic, inline code, code blocks, and links.
 */
export function markdownToTelegramHtml(text: string): string {
	// Escape HTML entities first
	let html = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	// Code blocks: ```lang\n...\n``` → <pre><code>...</code></pre>
	html = html.replace(
		/```(?:\w*)\n([\s\S]*?)```/g,
		(_, code) => `<pre><code>${code.trimEnd()}</code></pre>`,
	);

	// Inline code: `...` → <code>...</code>
	html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

	// Bold: **...** → <b>...</b>
	html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

	// Italic: *...* → <i>...</i>  (single asterisk, after bold replacement)
	html = html.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, "<i>$1</i>");

	// Links: [text](url) → <a href="url">text</a>
	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

	return html;
}

function extractAttachments(msg: TelegramMessage): Attachment[] {
	const attachments: Attachment[] = [];
	if (msg.photo && msg.photo.length > 0) {
		const largest = msg.photo.at(-1);
		if (largest) {
			attachments.push({ type: "photo", fileId: largest.file_id });
		}
	}
	if (msg.document) {
		attachments.push({ type: "document", fileId: msg.document.file_id });
	}
	return attachments;
}
