import { z } from "zod";
import type { ToolDefinition } from "./types";
import { defineTool } from "./types";

const VALID_KEY_PATTERN = /^[a-zA-Z0-9\-_/.]+$/;

export function validateFileKey(key: string): void {
	if (!key) {
		throw new Error("File key must not be empty");
	}
	if (key.startsWith("/")) {
		throw new Error("File key must not start with /");
	}
	if (key.startsWith(".")) {
		throw new Error("File key must not start with .");
	}
	if (key.includes("..")) {
		throw new Error("File key must not contain ..");
	}
	if (key.includes("//")) {
		throw new Error("File key must not contain empty segments");
	}
	if (!VALID_KEY_PATTERN.test(key)) {
		throw new Error(
			"File key contains invalid characters. Only alphanumeric, hyphens, underscores, slashes, and dots are allowed.",
		);
	}
}

export function createFileTools(bucket: R2Bucket): ToolDefinition[] {
	const listFiles = defineTool({
		name: "list_files",
		description:
			"List files in the R2 bucket. Returns key, size, and lastModified for each file. Supports prefix filtering and pagination.",
		inputSchema: z.object({
			prefix: z.string().optional().describe("Filter files by key prefix"),
			limit: z
				.number()
				.int()
				.min(1)
				.max(1000)
				.optional()
				.describe("Maximum number of files to return (default 100, max 1000)"),
			cursor: z
				.string()
				.optional()
				.describe("Pagination cursor from a previous list call"),
		}),
		riskLevel: "low",
		execute: async (input) => {
			const options: R2ListOptions = {
				limit: input.limit ?? 100,
			};
			if (input.prefix) {
				options.prefix = input.prefix;
			}
			if (input.cursor) {
				options.cursor = input.cursor;
			}

			const listed = await bucket.list(options);
			const files = listed.objects.map((obj) => ({
				key: obj.key,
				size: obj.size,
				lastModified: obj.uploaded.toISOString(),
			}));

			return {
				files,
				truncated: listed.truncated,
				cursor: listed.truncated ? listed.cursor : undefined,
			};
		},
	});

	const readFile = defineTool({
		name: "read_file",
		description:
			"Read a file from the R2 bucket. Returns the file content as text.",
		inputSchema: z.object({
			key: z.string().describe("File key to read"),
		}),
		riskLevel: "low",
		execute: async (input) => {
			validateFileKey(input.key);

			const object = await bucket.get(input.key);
			if (!object) {
				throw new Error(`File not found: ${input.key}`);
			}

			const content = await object.text();
			return {
				key: input.key,
				content,
				size: object.size,
				lastModified: object.uploaded.toISOString(),
			};
		},
	});

	const writeFile = defineTool({
		name: "write_file",
		description:
			"Write a file to the R2 bucket. Creates or overwrites the file. This action will be reported to the user.",
		inputSchema: z.object({
			key: z.string().describe("File key to write"),
			content: z.string().describe("File content to write"),
		}),
		riskLevel: "medium",
		execute: async (input) => {
			validateFileKey(input.key);

			await bucket.put(input.key, input.content);
			return {
				key: input.key,
				written: true,
				size: new TextEncoder().encode(input.content).length,
			};
		},
	});

	const deleteFile = defineTool({
		name: "delete_file",
		description:
			"Delete a file from the R2 bucket. Requires approval before execution.",
		inputSchema: z.object({
			key: z.string().describe("File key to delete"),
		}),
		riskLevel: "high",
		execute: async (input) => {
			validateFileKey(input.key);

			const object = await bucket.head(input.key);
			if (!object) {
				throw new Error(`File not found: ${input.key}`);
			}

			await bucket.delete(input.key);
			return { key: input.key, deleted: true };
		},
	});

	return [listFiles, readFile, writeFile, deleteFile];
}
