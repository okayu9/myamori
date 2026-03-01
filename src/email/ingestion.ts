import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import PostalMime from "postal-mime";
import { createDb } from "../db";
import { emails } from "../db/schema";

export interface EmailIngestionEnv {
	DB: D1Database;
	FILE_BUCKET: R2Bucket;
	ANTHROPIC_API_KEY: string;
	ANTHROPIC_MODEL?: string;
}

export interface EmailIngestionOptions {
	summarize?: (subject: string, body: string) => Promise<string>;
}

export interface EmailIngestionResult {
	id: string;
	from: string;
	subject: string;
	summary: string;
}

export function stripHtml(html: string): string {
	return html
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n\n")
		.replace(/<\/div>/gi, "\n")
		.replace(/<\/li>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

async function defaultSummarize(
	apiKey: string,
	model: string,
	subject: string,
	body: string,
): Promise<string> {
	const anthropic = createAnthropic({ apiKey });
	const truncatedBody = body.length > 2000 ? `${body.slice(0, 2000)}...` : body;

	const result = await generateText({
		model: anthropic(model),
		maxOutputTokens: 100,
		messages: [
			{
				role: "user",
				content: `Summarize this email in one concise sentence (max 100 characters). Subject: "${subject}"\n\n${truncatedBody}`,
			},
		],
	});

	return result.text.trim();
}

export async function ingestEmail(
	raw: ReadableStream | ArrayBuffer | string,
	env: EmailIngestionEnv,
	options?: EmailIngestionOptions,
): Promise<EmailIngestionResult> {
	const parsed = await PostalMime.parse(raw);

	const from = parsed.from?.address ?? parsed.from?.name ?? "unknown";
	const to = parsed.to?.[0]?.address ?? "unknown";
	const subject = parsed.subject ?? "(no subject)";
	const receivedAt = parsed.date
		? new Date(parsed.date).toISOString()
		: new Date().toISOString();

	let body = parsed.text ?? "";
	if (!body && parsed.html) {
		body = stripHtml(parsed.html);
	}

	const model = env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
	const summarize =
		options?.summarize ??
		((s: string, b: string) =>
			defaultSummarize(env.ANTHROPIC_API_KEY, model, s, b));
	const summary = await summarize(subject, body);

	const id = crypto.randomUUID();
	const r2Key = `emails/${id}/body.txt`;
	const now = new Date().toISOString();

	await env.FILE_BUCKET.put(r2Key, body);

	if (parsed.attachments && parsed.attachments.length > 0) {
		await Promise.all(
			parsed.attachments.map((att) => {
				const filename = att.filename ?? "unnamed";
				const attKey = `emails/${id}/attachments/${filename}`;
				return env.FILE_BUCKET.put(attKey, att.content);
			}),
		);
	}

	const db = createDb(env.DB);
	await db.insert(emails).values({
		id,
		fromAddress: from,
		toAddress: to,
		subject,
		summary,
		receivedAt,
		r2Key,
		createdAt: now,
	});

	return { id, from, subject, summary };
}
