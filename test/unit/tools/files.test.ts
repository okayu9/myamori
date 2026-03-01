import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createFileTools, validateFileKey } from "../../../src/tools/files";

describe("validateFileKey", () => {
	it("accepts valid keys", () => {
		expect(() => validateFileKey("notes/todo.txt")).not.toThrow();
		expect(() => validateFileKey("data.json")).not.toThrow();
		expect(() => validateFileKey("a/b/c.md")).not.toThrow();
		expect(() => validateFileKey("file-name_v2.txt")).not.toThrow();
	});

	it("rejects keys with ..", () => {
		expect(() => validateFileKey("a/../etc/passwd")).toThrow("..");
	});

	it("rejects keys starting with /", () => {
		expect(() => validateFileKey("/absolute/path")).toThrow("start with /");
	});

	it("rejects keys starting with .", () => {
		expect(() => validateFileKey(".hidden")).toThrow("start with .");
	});

	it("rejects empty keys", () => {
		expect(() => validateFileKey("")).toThrow("empty");
	});

	it("rejects keys with empty segments (//)", () => {
		expect(() => validateFileKey("a//b")).toThrow("empty segments");
	});

	it("rejects keys with invalid characters", () => {
		expect(() => validateFileKey("file name.txt")).toThrow(
			"invalid characters",
		);
		expect(() => validateFileKey("file@name")).toThrow("invalid characters");
	});
});

describe("file tools", () => {
	function getBucket() {
		return env.FILE_BUCKET;
	}

	describe("list_files", () => {
		it("returns file metadata", async () => {
			const bucket = getBucket();
			await bucket.put("test-list/a.txt", "hello");
			await bucket.put("test-list/b.txt", "world");

			const tools = createFileTools(bucket);
			const tool = tools.find((t) => t.name === "list_files");
			expect(tool).toBeDefined();

			const result = (await tool?.execute({
				prefix: "test-list/",
			})) as {
				files: Array<{ key: string; size: number; lastModified: string }>;
				truncated: boolean;
			};

			expect(result.files.length).toBeGreaterThanOrEqual(2);
			const keys = result.files.map((f) => f.key);
			expect(keys).toContain("test-list/a.txt");
			expect(keys).toContain("test-list/b.txt");
			expect(result.files[0]?.size).toBeGreaterThan(0);
			expect(result.files[0]?.lastModified).toBeTruthy();
		});

		it("respects limit parameter", async () => {
			const bucket = getBucket();
			await bucket.put("test-limit/1.txt", "a");
			await bucket.put("test-limit/2.txt", "b");
			await bucket.put("test-limit/3.txt", "c");

			const tools = createFileTools(bucket);
			const tool = tools.find((t) => t.name === "list_files");

			const result = (await tool?.execute({
				prefix: "test-limit/",
				limit: 2,
			})) as {
				files: Array<{ key: string }>;
				truncated: boolean;
			};

			expect(result.files).toHaveLength(2);
		});
	});

	describe("read_file", () => {
		it("returns file content as text", async () => {
			const bucket = getBucket();
			await bucket.put("test-read/hello.txt", "Hello, world!");

			const tools = createFileTools(bucket);
			const tool = tools.find((t) => t.name === "read_file");

			const result = (await tool?.execute({
				key: "test-read/hello.txt",
			})) as { key: string; content: string; size: number };

			expect(result.content).toBe("Hello, world!");
			expect(result.key).toBe("test-read/hello.txt");
			expect(result.size).toBe(13);
		});

		it("throws on missing key", async () => {
			const bucket = getBucket();
			const tools = createFileTools(bucket);
			const tool = tools.find((t) => t.name === "read_file");

			await expect(
				tool?.execute({ key: "nonexistent-file.txt" }),
			).rejects.toThrow("File not found");
		});
	});

	describe("write_file", () => {
		it("writes content to R2", async () => {
			const bucket = getBucket();
			const tools = createFileTools(bucket);
			const tool = tools.find((t) => t.name === "write_file");

			const result = (await tool?.execute({
				key: "test-write/output.txt",
				content: "Written by test",
			})) as { key: string; written: boolean; size: number };

			expect(result.written).toBe(true);
			expect(result.size).toBe(15);

			// Verify content was written
			const obj = await bucket.get("test-write/output.txt");
			expect(await obj?.text()).toBe("Written by test");
		});
	});

	describe("delete_file", () => {
		it("deletes file from R2", async () => {
			const bucket = getBucket();
			await bucket.put("test-delete/remove.txt", "to be deleted");

			const tools = createFileTools(bucket);
			const tool = tools.find((t) => t.name === "delete_file");

			const result = (await tool?.execute({
				key: "test-delete/remove.txt",
			})) as { key: string; deleted: boolean };

			expect(result.deleted).toBe(true);

			// Verify file was deleted
			const obj = await bucket.get("test-delete/remove.txt");
			expect(obj).toBeNull();
		});

		it("throws on missing key", async () => {
			const bucket = getBucket();
			const tools = createFileTools(bucket);
			const tool = tools.find((t) => t.name === "delete_file");

			await expect(
				tool?.execute({ key: "nonexistent-delete.txt" }),
			).rejects.toThrow("File not found");
		});
	});
});
