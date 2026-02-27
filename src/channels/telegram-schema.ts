import { z } from "zod";

const telegramUserSchema = z.object({
	id: z.number(),
	first_name: z.string(),
	last_name: z.string().optional(),
	username: z.string().optional(),
});

const telegramChatSchema = z.object({
	id: z.number(),
	type: z.string(),
});

const telegramPhotoSizeSchema = z.object({
	file_id: z.string(),
	file_unique_id: z.string(),
	width: z.number(),
	height: z.number(),
});

const telegramDocumentSchema = z.object({
	file_id: z.string(),
	file_unique_id: z.string(),
	file_name: z.string().optional(),
});

const telegramMessageSchema = z.object({
	message_id: z.number(),
	from: telegramUserSchema.optional(),
	chat: telegramChatSchema,
	text: z.string().optional(),
	message_thread_id: z.number().optional(),
	photo: z.array(telegramPhotoSizeSchema).optional(),
	document: telegramDocumentSchema.optional(),
});

export const telegramUpdateSchema = z.object({
	update_id: z.number(),
	message: telegramMessageSchema.optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
export type TelegramMessage = z.infer<typeof telegramMessageSchema>;
