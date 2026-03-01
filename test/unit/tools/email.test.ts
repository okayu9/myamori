import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../../src/db";
import { emails } from "../../../src/db/schema";
import { createEmailTools } from "../../../src/tools/email";

function getDb() {
	return createDb(env.DB);
}

function getBucket() {
	return env.FILE_BUCKET as R2Bucket;
}

async function insertEmail(
	db: ReturnType<typeof getDb>,
	bucket: R2Bucket,
	overrides: Partial<typeof emails.$inferInsert> & { body?: string } = {},
) {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	const r2Key = `emails/${id}/body.txt`;
	const body = overrides.body ?? "Default email body";

	await bucket.put(r2Key, body);

	await db.insert(emails).values({
		id,
		fromAddress: "sender@example.com",
		toAddress: "inbox@myamori.com",
		subject: "Test Subject",
		summary: "A test email summary",
		receivedAt: now,
		r2Key,
		createdAt: now,
		...overrides,
	});
	return id;
}

describe("email tools", () => {
	beforeEach(async () => {
		const db = getDb();
		await db.delete(emails);
	});

	describe("search_emails", () => {
		it("finds emails matching subject", async () => {
			const db = getDb();
			const bucket = getBucket();
			await insertEmail(db, bucket, { subject: "Invoice from Acme" });
			await insertEmail(db, bucket, { subject: "Meeting notes" });

			const tools = createEmailTools(db, bucket);
			const searchTool = tools.find((t) => t.name === "search_emails");
			// biome-ignore lint/style/noNonNullAssertion: test assertion
			const result = (await searchTool!.execute({ query: "Invoice" })) as {
				emails: { subject: string }[];
			};

			expect(result.emails).toHaveLength(1);
			expect(result.emails[0]?.subject).toBe("Invoice from Acme");
		});

		it("finds emails matching summary", async () => {
			const db = getDb();
			const bucket = getBucket();
			await insertEmail(db, bucket, {
				subject: "Hello",
				summary: "Discussion about project deadline",
			});

			const tools = createEmailTools(db, bucket);
			const searchTool = tools.find((t) => t.name === "search_emails");
			// biome-ignore lint/style/noNonNullAssertion: test assertion
			const result = (await searchTool!.execute({ query: "deadline" })) as {
				emails: { subject: string }[];
			};

			expect(result.emails).toHaveLength(1);
		});

		it("returns empty list when no matches", async () => {
			const db = getDb();
			const bucket = getBucket();
			await insertEmail(db, bucket, { subject: "Regular email" });

			const tools = createEmailTools(db, bucket);
			const searchTool = tools.find((t) => t.name === "search_emails");
			// biome-ignore lint/style/noNonNullAssertion: test assertion
			const result = (await searchTool!.execute({
				query: "nonexistent",
			})) as { emails: unknown[] };

			expect(result.emails).toHaveLength(0);
		});

		it("respects limit parameter", async () => {
			const db = getDb();
			const bucket = getBucket();
			for (let i = 0; i < 5; i++) {
				await insertEmail(db, bucket, { subject: `Test email ${i}` });
			}

			const tools = createEmailTools(db, bucket);
			const searchTool = tools.find((t) => t.name === "search_emails");
			// biome-ignore lint/style/noNonNullAssertion: test assertion
			const result = (await searchTool!.execute({
				query: "Test email",
				limit: 3,
			})) as { emails: unknown[] };

			expect(result.emails).toHaveLength(3);
		});
	});

	describe("read_email", () => {
		it("returns email metadata and body", async () => {
			const db = getDb();
			const bucket = getBucket();
			const id = await insertEmail(db, bucket, {
				subject: "Read me",
				body: "Full email body content",
			});

			const tools = createEmailTools(db, bucket);
			const readTool = tools.find((t) => t.name === "read_email");
			// biome-ignore lint/style/noNonNullAssertion: test assertion
			const result = (await readTool!.execute({ emailId: id })) as {
				subject: string;
				body: string;
			};

			expect(result.subject).toBe("Read me");
			expect(result.body).toBe("Full email body content");
		});

		it("throws error for nonexistent email", async () => {
			const db = getDb();
			const bucket = getBucket();

			const tools = createEmailTools(db, bucket);
			const readTool = tools.find((t) => t.name === "read_email");

			await expect(
				// biome-ignore lint/style/noNonNullAssertion: test assertion
				readTool!.execute({ emailId: "nonexistent-id" }),
			).rejects.toThrow("Email not found");
		});
	});
});
