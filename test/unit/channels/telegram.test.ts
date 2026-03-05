import { describe, expect, it } from "vitest";
import {
	markdownToTelegramHtml,
	TelegramAdapter,
} from "../../../src/channels/telegram";

const adapter = new TelegramAdapter("test-bot-token", "test-webhook-secret");

describe("TelegramAdapter", () => {
	describe("verifyRequest", () => {
		it("returns true for valid secret token", async () => {
			const req = new Request("http://localhost/webhook", {
				headers: { "x-telegram-bot-api-secret-token": "test-webhook-secret" },
			});
			expect(await adapter.verifyRequest(req)).toBe(true);
		});

		it("returns false for invalid secret token", async () => {
			const req = new Request("http://localhost/webhook", {
				headers: { "x-telegram-bot-api-secret-token": "wrong-secret" },
			});
			expect(await adapter.verifyRequest(req)).toBe(false);
		});

		it("returns false when header is missing", async () => {
			const req = new Request("http://localhost/webhook");
			expect(await adapter.verifyRequest(req)).toBe(false);
		});
	});

	describe("parseMessage", () => {
		it("parses valid text message", async () => {
			const body = {
				update_id: 1,
				message: {
					message_id: 100,
					from: { id: 42, first_name: "Test" },
					chat: { id: -1001, type: "supergroup" },
					text: "hello",
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const msg = await adapter.parseMessage(req);
			expect(msg).not.toBeNull();
			expect(msg?.userId).toBe("42");
			expect(msg?.text).toBe("hello");
			expect(msg?.chatId).toBe("-1001");
			expect(msg?.attachments).toEqual([]);
		});

		it("includes threadId when present", async () => {
			const body = {
				update_id: 2,
				message: {
					message_id: 101,
					from: { id: 42, first_name: "Test" },
					chat: { id: -1001, type: "supergroup" },
					text: "topic message",
					message_thread_id: 5,
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const msg = await adapter.parseMessage(req);
			expect(msg).not.toBeNull();
			expect(msg?.threadId).toBe(5);
		});

		it("returns null for non-message update", async () => {
			const body = { update_id: 3 };
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			expect(await adapter.parseMessage(req)).toBeNull();
		});

		it("returns null when text and caption are both missing", async () => {
			const body = {
				update_id: 4,
				message: {
					message_id: 102,
					from: { id: 42, first_name: "Test" },
					chat: { id: -1001, type: "supergroup" },
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			expect(await adapter.parseMessage(req)).toBeNull();
		});

		it("uses caption as text for media messages", async () => {
			const body = {
				update_id: 7,
				message: {
					message_id: 105,
					from: { id: 42, first_name: "Test" },
					chat: { id: -1001, type: "supergroup" },
					caption: "photo description",
					photo: [
						{
							file_id: "img",
							file_unique_id: "u1",
							width: 800,
							height: 600,
						},
					],
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const msg = await adapter.parseMessage(req);
			expect(msg).not.toBeNull();
			expect(msg?.text).toBe("photo description");
			expect(msg?.attachments).toEqual([{ type: "photo", fileId: "img" }]);
		});

		it("returns null when from is missing", async () => {
			const body = {
				update_id: 5,
				message: {
					message_id: 103,
					chat: { id: -1001, type: "supergroup" },
					text: "anonymous",
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			expect(await adapter.parseMessage(req)).toBeNull();
		});

		it("extracts photo attachment", async () => {
			const body = {
				update_id: 6,
				message: {
					message_id: 104,
					from: { id: 42, first_name: "Test" },
					chat: { id: -1001, type: "supergroup" },
					text: "photo caption",
					photo: [
						{
							file_id: "small",
							file_unique_id: "s1",
							width: 90,
							height: 90,
						},
						{
							file_id: "large",
							file_unique_id: "l1",
							width: 800,
							height: 600,
						},
					],
				},
			};
			const req = new Request("http://localhost/webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const msg = await adapter.parseMessage(req);
			expect(msg).not.toBeNull();
			expect(msg?.attachments).toEqual([{ type: "photo", fileId: "large" }]);
		});
	});
});

describe("markdownToTelegramHtml", () => {
	it("converts bold **text** to <b>text</b>", () => {
		expect(markdownToTelegramHtml("This is **bold** text")).toBe(
			"This is <b>bold</b> text",
		);
	});

	it("converts italic *text* to <i>text</i>", () => {
		expect(markdownToTelegramHtml("This is *italic* text")).toBe(
			"This is <i>italic</i> text",
		);
	});

	it("converts inline code to <code>", () => {
		expect(markdownToTelegramHtml("Use `console.log`")).toBe(
			"Use <code>console.log</code>",
		);
	});

	it("converts code blocks to <pre><code>", () => {
		const input = "```js\nconst x = 1;\n```";
		expect(markdownToTelegramHtml(input)).toBe(
			"<pre><code>const x = 1;</code></pre>",
		);
	});

	it("converts links to <a> tags", () => {
		expect(markdownToTelegramHtml("[Google](https://google.com)")).toBe(
			'<a href="https://google.com">Google</a>',
		);
	});

	it("escapes double quotes in link URLs", () => {
		expect(markdownToTelegramHtml('[test](https://x.com/a"b)')).toBe(
			'<a href="https://x.com/a&quot;b">test</a>',
		);
	});

	it("converts code blocks with extra whitespace after language tag", () => {
		const input = "```js \nconst x = 1;\n```";
		expect(markdownToTelegramHtml(input)).toBe(
			"<pre><code>const x = 1;</code></pre>",
		);
	});

	it("escapes HTML entities", () => {
		expect(markdownToTelegramHtml("a < b & c > d")).toBe(
			"a &lt; b &amp; c &gt; d",
		);
	});

	it("handles bold and italic together", () => {
		expect(markdownToTelegramHtml("**bold** and *italic*")).toBe(
			"<b>bold</b> and <i>italic</i>",
		);
	});

	it("passes plain text through unchanged", () => {
		expect(markdownToTelegramHtml("Hello world")).toBe("Hello world");
	});

	it("does not apply italic inside link URLs", () => {
		expect(markdownToTelegramHtml("[x](https://e.com/*p*)")).toBe(
			'<a href="https://e.com/*p*">x</a>',
		);
	});

	it("does not apply bold/italic inside inline code", () => {
		expect(markdownToTelegramHtml("`**not bold**`")).toBe(
			"<code>**not bold**</code>",
		);
	});

	it("handles code fences with non-word language tags", () => {
		const input = "```c++\n**x**\n```";
		expect(markdownToTelegramHtml(input)).toBe("<pre><code>**x**</code></pre>");
	});

	it("keeps URLs containing parentheses intact", () => {
		expect(markdownToTelegramHtml("[x](https://example.com/a_(b))")).toBe(
			'<a href="https://example.com/a_(b)">x</a>',
		);
	});

	it("does not apply formatting inside code blocks", () => {
		const input = "```\n**bold** *italic*\n```";
		expect(markdownToTelegramHtml(input)).toBe(
			"<pre><code>**bold** *italic*</code></pre>",
		);
	});

	it("handles multiple bold segments in one line", () => {
		expect(markdownToTelegramHtml("**a** then **b**")).toBe(
			"<b>a</b> then <b>b</b>",
		);
	});

	it("handles multiple italic segments in one line", () => {
		expect(markdownToTelegramHtml("*a* then *b*")).toBe(
			"<i>a</i> then <i>b</i>",
		);
	});

	it("handles multiple inline code spans", () => {
		expect(markdownToTelegramHtml("`a` and `b`")).toBe(
			"<code>a</code> and <code>b</code>",
		);
	});

	it("handles multiple links", () => {
		const input = "[a](https://a.com) and [b](https://b.com)";
		expect(markdownToTelegramHtml(input)).toBe(
			'<a href="https://a.com">a</a> and <a href="https://b.com">b</a>',
		);
	});

	it("does not convert unmatched single asterisk", () => {
		expect(markdownToTelegramHtml("5 * 3 = 15")).toBe("5 * 3 = 15");
	});

	it("does not convert asterisks mid-word", () => {
		expect(markdownToTelegramHtml("file*name*here")).toBe("file*name*here");
	});

	it("handles empty string", () => {
		expect(markdownToTelegramHtml("")).toBe("");
	});

	it("handles code block without language tag", () => {
		const input = "```\nplain code\n```";
		expect(markdownToTelegramHtml(input)).toBe(
			"<pre><code>plain code</code></pre>",
		);
	});

	it("handles mixed formatting in complex message", () => {
		const input =
			"Hello **world**, check *this* `code` and [link](https://x.com)";
		expect(markdownToTelegramHtml(input)).toBe(
			'Hello <b>world</b>, check <i>this</i> <code>code</code> and <a href="https://x.com">link</a>',
		);
	});

	it("handles code block with surrounding text", () => {
		const input = "Before\n```\ncode\n```\nAfter";
		expect(markdownToTelegramHtml(input)).toBe(
			"Before\n<pre><code>code</code></pre>\nAfter",
		);
	});

	it("handles HTML entities inside code blocks", () => {
		const input = "```\na < b && c > d\n```";
		expect(markdownToTelegramHtml(input)).toBe(
			"<pre><code>a &lt; b &amp;&amp; c &gt; d</code></pre>",
		);
	});

	it("handles HTML entities inside inline code", () => {
		expect(markdownToTelegramHtml("`a < b`")).toBe("<code>a &lt; b</code>");
	});

	it("does not apply bold inside link text when tokenized", () => {
		expect(markdownToTelegramHtml("[**bold**](https://x.com)")).toBe(
			'<a href="https://x.com">**bold**</a>',
		);
	});

	it("handles multiline bold text", () => {
		expect(markdownToTelegramHtml("**line1\nline2**")).toBe(
			"<b>line1\nline2</b>",
		);
	});

	it("handles multiple code blocks in one message", () => {
		const input = "```\nfirst\n```\ntext\n```\nsecond\n```";
		expect(markdownToTelegramHtml(input)).toBe(
			"<pre><code>first</code></pre>\ntext\n<pre><code>second</code></pre>",
		);
	});

	it("preserves line breaks", () => {
		expect(markdownToTelegramHtml("line1\nline2\nline3")).toBe(
			"line1\nline2\nline3",
		);
	});
});
