import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../../src/db";
import { emails } from "../../../src/db/schema";
import type { EmailIngestionEnv } from "../../../src/email/ingestion";
import { ingestEmail, stripHtml } from "../../../src/email/ingestion";

const mockSummarize = async () => "Test email summary";

function buildMimeMessage(options: {
	from?: string;
	to?: string;
	subject?: string;
	textBody?: string;
	htmlBody?: string;
}): string {
	const from = options.from ?? "sender@example.com";
	const to = options.to ?? "inbox@myamori.com";
	const subject = options.subject ?? "Test Subject";
	const boundary = "----boundary123";

	let body = "";
	if (options.textBody) {
		body += `--${boundary}\r\nContent-Type: text/plain\r\n\r\n${options.textBody}\r\n`;
	}
	if (options.htmlBody) {
		body += `--${boundary}\r\nContent-Type: text/html\r\n\r\n${options.htmlBody}\r\n`;
	}
	if (!options.textBody && !options.htmlBody) {
		body += `--${boundary}\r\nContent-Type: text/plain\r\n\r\nDefault body\r\n`;
	}
	body += `--${boundary}--`;

	return [
		`From: ${from}`,
		`To: ${to}`,
		`Subject: ${subject}`,
		"Date: Mon, 01 Jan 2025 10:00:00 +0000",
		`Content-Type: multipart/mixed; boundary="${boundary}"`,
		"MIME-Version: 1.0",
		"",
		body,
	].join("\r\n");
}

function getTestEnv(): EmailIngestionEnv {
	return {
		DB: env.DB,
		FILE_BUCKET: env.FILE_BUCKET as R2Bucket,
		ANTHROPIC_API_KEY: "test-key",
		ANTHROPIC_MODEL: "claude-haiku-4-5",
	};
}

describe("stripHtml", () => {
	it("removes HTML tags", () => {
		expect(stripHtml("<p>Hello <strong>world</strong></p>")).toContain("Hello");
		expect(stripHtml("<p>Hello <strong>world</strong></p>")).toContain("world");
		expect(stripHtml("<p>Hello <strong>world</strong></p>")).not.toContain(
			"<p>",
		);
	});

	it("converts br tags to newlines", () => {
		expect(stripHtml("line1<br>line2")).toBe("line1\nline2");
	});

	it("removes style and script blocks", () => {
		const html =
			"<style>.foo { color: red; }</style><script>alert(1)</script><p>Content</p>";
		const result = stripHtml(html);
		expect(result).not.toContain("color");
		expect(result).not.toContain("alert");
		expect(result).toContain("Content");
	});

	it("decodes HTML entities", () => {
		expect(stripHtml("&amp; &lt; &gt; &quot; &#39;")).toBe("& < > \" '");
	});
});

describe("ingestEmail", () => {
	beforeEach(async () => {
		const db = createDb(env.DB);
		await db.delete(emails);
	});

	it("parses MIME and stores metadata in D1", async () => {
		const mime = buildMimeMessage({
			from: "alice@example.com",
			subject: "Hello",
			textBody: "Hi there!",
		});

		const result = await ingestEmail(mime, getTestEnv(), {
			summarize: mockSummarize,
		});

		expect(result.id).toBeDefined();
		expect(result.from).toBe("alice@example.com");
		expect(result.subject).toBe("Hello");
		expect(result.summary).toBe("Test email summary");

		const db = createDb(env.DB);
		const [stored] = await db
			.select()
			.from(emails)
			.where(eq(emails.id, result.id));
		expect(stored).toBeDefined();
		expect(stored?.fromAddress).toBe("alice@example.com");
		expect(stored?.subject).toBe("Hello");
	});

	it("stores text body in R2", async () => {
		const mime = buildMimeMessage({
			textBody: "Email body content here",
		});

		const result = await ingestEmail(mime, getTestEnv(), {
			summarize: mockSummarize,
		});

		const r2Obj = await (env.FILE_BUCKET as R2Bucket).get(
			`emails/${result.id}/body.txt`,
		);
		expect(r2Obj).not.toBeNull();
		// biome-ignore lint/style/noNonNullAssertion: asserted above
		const body = await r2Obj!.text();
		expect(body.trim()).toBe("Email body content here");
	});

	it("converts HTML to text when no text body available", async () => {
		const mime = buildMimeMessage({
			htmlBody: "<p>Hello <strong>world</strong></p>",
		});

		const result = await ingestEmail(mime, getTestEnv(), {
			summarize: mockSummarize,
		});

		const r2Obj = await (env.FILE_BUCKET as R2Bucket).get(
			`emails/${result.id}/body.txt`,
		);
		expect(r2Obj).not.toBeNull();
		// biome-ignore lint/style/noNonNullAssertion: asserted above
		const body = await r2Obj!.text();
		expect(body).toContain("Hello");
		expect(body).toContain("world");
		expect(body).not.toContain("<p>");
	});

	it("handles email with no subject", async () => {
		const rawMime = [
			"From: sender@example.com",
			"To: inbox@myamori.com",
			"Date: Mon, 01 Jan 2025 10:00:00 +0000",
			"Content-Type: text/plain",
			"MIME-Version: 1.0",
			"",
			"Body without subject",
		].join("\r\n");

		const result = await ingestEmail(rawMime, getTestEnv(), {
			summarize: mockSummarize,
		});

		expect(result.subject).toBe("(no subject)");
	});
});
