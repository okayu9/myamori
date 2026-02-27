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
		const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
		const body: Record<string, unknown> = {
			chat_id: chatId,
			text,
		};
		if (threadId !== undefined) {
			body.message_thread_id = threadId;
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
				`Telegram sendMessage failed (${data.error_code}): ${data.description}`,
			);
		}
	}
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
