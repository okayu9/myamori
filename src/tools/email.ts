import { desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import type { createDb } from "../db";
import { emails } from "../db/schema";
import type { ToolDefinition } from "./types";
import { defineTool } from "./types";

export function createEmailTools(
	db: ReturnType<typeof createDb>,
	bucket: R2Bucket,
): ToolDefinition[] {
	const searchEmails = defineTool({
		name: "search_emails",
		description:
			"Search forwarded emails by keyword. Searches over subject and summary fields. Returns a list of matching emails with sender, subject, date, and summary.",
		inputSchema: z.object({
			query: z
				.string()
				.describe("Keyword to search for in subject and summary"),
			limit: z
				.number()
				.int()
				.min(1)
				.max(50)
				.default(10)
				.optional()
				.describe("Maximum number of results (default 10, max 50)"),
		}),
		riskLevel: "low",
		execute: async (input) => {
			const limit = input.limit ?? 10;
			const pattern = `%${input.query}%`;

			const results = await db
				.select({
					id: emails.id,
					from: emails.fromAddress,
					subject: emails.subject,
					receivedAt: emails.receivedAt,
					summary: emails.summary,
				})
				.from(emails)
				.where(or(like(emails.subject, pattern), like(emails.summary, pattern)))
				.orderBy(desc(emails.receivedAt))
				.limit(limit);

			return { emails: results };
		},
	});

	const readEmail = defineTool({
		name: "read_email",
		description:
			"Read the full content of a forwarded email by its ID. Returns the email metadata and full text body.",
		inputSchema: z.object({
			emailId: z.string().describe("ID of the email to read"),
		}),
		riskLevel: "low",
		execute: async (input) => {
			const [email] = await db
				.select()
				.from(emails)
				.where(eq(emails.id, input.emailId))
				.limit(1);

			if (!email) {
				throw new Error(`Email not found: ${input.emailId}`);
			}

			const bodyObj = await bucket.get(email.r2Key);
			const body = bodyObj ? await bodyObj.text() : "";

			return {
				id: email.id,
				from: email.fromAddress,
				to: email.toAddress,
				subject: email.subject,
				receivedAt: email.receivedAt,
				summary: email.summary,
				body,
			};
		},
	});

	return [searchEmails, readEmail];
}
