import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
	createApproval,
	getApproval,
	resolveApproval,
} from "../../../src/approval/handler";
import { createDb } from "../../../src/db";

describe("approval handler", () => {
	function getDb() {
		return createDb(env.DB);
	}

	describe("createApproval", () => {
		it("creates a pending approval and returns an ID", async () => {
			const db = getDb();
			const id = await createApproval(db, {
				chatId: "chat-1",
				toolName: "delete_file",
				toolInput: { path: "/test.txt" },
			});

			expect(id).toBeTruthy();
			expect(typeof id).toBe("string");

			const approval = await getApproval(db, id);
			expect(approval).not.toBeNull();
			expect(approval?.chatId).toBe("chat-1");
			expect(approval?.toolName).toBe("delete_file");
			expect(approval?.toolInput).toBe('{"path":"/test.txt"}');
			expect(approval?.status).toBe("pending");
			expect(approval?.threadId).toBeNull();
		});

		it("stores threadId when provided", async () => {
			const db = getDb();
			const id = await createApproval(db, {
				chatId: "chat-2",
				threadId: 42,
				toolName: "create_event",
				toolInput: { title: "Meeting" },
			});

			const approval = await getApproval(db, id);
			expect(approval?.threadId).toBe(42);
		});

		it("sets expiresAt to 10 minutes after creation", async () => {
			const db = getDb();
			const id = await createApproval(db, {
				chatId: "chat-3",
				toolName: "delete_file",
				toolInput: {},
			});

			const approval = await getApproval(db, id);
			expect(approval).not.toBeNull();
			const created = new Date(approval?.createdAt ?? "").getTime();
			const expires = new Date(approval?.expiresAt ?? "").getTime();
			expect(expires - created).toBe(10 * 60_000);
		});
	});

	describe("getApproval", () => {
		it("returns null for non-existent ID", async () => {
			const db = getDb();
			const result = await getApproval(db, "non-existent-id");
			expect(result).toBeNull();
		});
	});

	describe("resolveApproval", () => {
		it("approves a pending approval", async () => {
			const db = getDb();
			const id = await createApproval(db, {
				chatId: "chat-approve",
				toolName: "delete_file",
				toolInput: { path: "/a.txt" },
			});

			const result = await resolveApproval(db, id, "approved");
			expect(result).toBe("resolved");

			const approval = await getApproval(db, id);
			expect(approval?.status).toBe("approved");
		});

		it("rejects a pending approval", async () => {
			const db = getDb();
			const id = await createApproval(db, {
				chatId: "chat-reject",
				toolName: "delete_file",
				toolInput: { path: "/b.txt" },
			});

			const result = await resolveApproval(db, id, "rejected");
			expect(result).toBe("resolved");

			const approval = await getApproval(db, id);
			expect(approval?.status).toBe("rejected");
		});

		it("returns already_resolved for double-click", async () => {
			const db = getDb();
			const id = await createApproval(db, {
				chatId: "chat-double",
				toolName: "delete_file",
				toolInput: {},
			});

			await resolveApproval(db, id, "approved");
			const result = await resolveApproval(db, id, "approved");
			expect(result).toBe("already_resolved");
		});

		it("returns not_found for non-existent ID", async () => {
			const db = getDb();
			const result = await resolveApproval(db, "no-such-id", "approved");
			expect(result).toBe("not_found");
		});

		it("returns expired for timed-out approval", async () => {
			const db = getDb();
			const id = await createApproval(db, {
				chatId: "chat-expired",
				toolName: "delete_file",
				toolInput: {},
			});

			// Manually set expiresAt to the past
			const { pendingApprovals } = await import("../../../src/db/schema");
			const { eq } = await import("drizzle-orm");
			await db
				.update(pendingApprovals)
				.set({ expiresAt: new Date(0).toISOString() })
				.where(eq(pendingApprovals.id, id));

			const result = await resolveApproval(db, id, "approved");
			expect(result).toBe("expired");

			const approval = await getApproval(db, id);
			expect(approval?.status).toBe("expired");
		});
	});
});
