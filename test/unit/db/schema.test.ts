import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { messages } from "../../../src/db/schema";

describe("messages schema", () => {
	it("has table name 'messages'", () => {
		expect(getTableName(messages)).toBe("messages");
	});

	it("has the expected columns", () => {
		const columns = getTableColumns(messages);
		expect(Object.keys(columns)).toEqual([
			"id",
			"chatId",
			"role",
			"content",
			"createdAt",
		]);
	});

	it("has id as primary key", () => {
		const columns = getTableColumns(messages);
		expect(columns.id.primary).toBe(true);
	});

	it("has notNull on required columns", () => {
		const columns = getTableColumns(messages);
		expect(columns.chatId.notNull).toBe(true);
		expect(columns.role.notNull).toBe(true);
		expect(columns.content.notNull).toBe(true);
		expect(columns.createdAt.notNull).toBe(true);
	});
});
