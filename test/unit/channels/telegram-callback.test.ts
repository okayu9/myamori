import { describe, expect, it } from "vitest";
import { telegramUpdateSchema } from "../../../src/channels/telegram-schema";

describe("Telegram callback_query parsing", () => {
	it("parses callback_query update", () => {
		const update = {
			update_id: 100,
			callback_query: {
				id: "cb-123",
				from: { id: 42, first_name: "Test" },
				message: {
					message_id: 200,
					chat: { id: -1001, type: "supergroup" },
				},
				data: "approve:abc123",
			},
		};

		const result = telegramUpdateSchema.safeParse(update);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.callback_query).toBeDefined();
			expect(result.data.callback_query?.id).toBe("cb-123");
			expect(result.data.callback_query?.from.id).toBe(42);
			expect(result.data.callback_query?.data).toBe("approve:abc123");
		}
	});

	it("parses callback_query without data", () => {
		const update = {
			update_id: 101,
			callback_query: {
				id: "cb-456",
				from: { id: 42, first_name: "Test" },
			},
		};

		const result = telegramUpdateSchema.safeParse(update);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.callback_query?.data).toBeUndefined();
		}
	});

	it("parses update with both message and callback_query absent", () => {
		const update = { update_id: 102 };
		const result = telegramUpdateSchema.safeParse(update);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.message).toBeUndefined();
			expect(result.data.callback_query).toBeUndefined();
		}
	});
});
