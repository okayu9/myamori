import { z } from "zod";

const telegramUserSchema = z.object({
	id: z.number().int(),
	first_name: z.string(),
	last_name: z.string().optional(),
	username: z.string().optional(),
});

const telegramChatSchema = z.object({
	id: z.number().int(),
	type: z.string(),
});

const telegramPhotoSizeSchema = z.object({
	file_id: z.string(),
	file_unique_id: z.string(),
	width: z.number().int(),
	height: z.number().int(),
});

const telegramDocumentSchema = z.object({
	file_id: z.string(),
	file_unique_id: z.string(),
	file_name: z.string().optional(),
});

const telegramMessageSchema = z.object({
	message_id: z.number().int(),
	from: telegramUserSchema.optional(),
	chat: telegramChatSchema,
	text: z.string().optional(),
	caption: z.string().optional(),
	message_thread_id: z.number().int().optional(),
	photo: z.array(telegramPhotoSizeSchema).optional(),
	document: telegramDocumentSchema.optional(),
});

const telegramCallbackQuerySchema = z.object({
	id: z.string(),
	from: telegramUserSchema,
	message: telegramMessageSchema.optional(),
	data: z.string().optional(),
});

export const telegramUpdateSchema = z.object({
	update_id: z.number().int(),
	message: telegramMessageSchema.optional(),
	callback_query: telegramCallbackQuerySchema.optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
export type TelegramMessage = z.infer<typeof telegramMessageSchema>;
export type TelegramCallbackQuery = z.infer<typeof telegramCallbackQuerySchema>;
