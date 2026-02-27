export interface Attachment {
	type: "photo" | "document";
	fileId: string;
}

export interface IncomingMessage {
	userId: string;
	text: string;
	chatId: string;
	threadId?: number;
	attachments: Attachment[];
	raw: unknown;
}

export interface ChannelAdapter {
	verifyRequest(req: Request): Promise<boolean>;
	parseMessage(req: Request): Promise<IncomingMessage | null>;
	sendReply(chatId: string, text: string, threadId?: number): Promise<void>;
}
