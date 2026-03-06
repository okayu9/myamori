import { and, desc, eq, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { createDb } from "../db";
import { pendingApprovals } from "../db/schema";

type Db = ReturnType<typeof createDb>;

const EXPIRY_MINUTES = 10;

export interface CreateApprovalParams {
	chatId: string;
	threadId?: number;
	toolName: string;
	toolInput: unknown;
}

export interface Approval {
	id: string;
	chatId: string;
	threadId: number | null;
	toolName: string;
	toolInput: string;
	status: "pending" | "approved" | "rejected" | "expired";
	createdAt: string;
	expiresAt: string;
}

export async function createApproval(
	db: Db,
	params: CreateApprovalParams,
): Promise<string> {
	const id = nanoid();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + EXPIRY_MINUTES * 60_000);

	await db.insert(pendingApprovals).values({
		id,
		chatId: params.chatId,
		threadId: params.threadId ?? null,
		toolName: params.toolName,
		toolInput: JSON.stringify(params.toolInput),
		status: "pending",
		createdAt: now.toISOString(),
		expiresAt: expiresAt.toISOString(),
	});

	return id;
}

export async function getApproval(
	db: Db,
	approvalId: string,
): Promise<Approval | null> {
	const rows = await db
		.select()
		.from(pendingApprovals)
		.where(eq(pendingApprovals.id, approvalId))
		.limit(1);

	const row = rows[0];
	if (!row) return null;

	return row as Approval;
}

export async function resolveApproval(
	db: Db,
	approvalId: string,
	action: "approved" | "rejected",
): Promise<"resolved" | "already_resolved" | "expired" | "not_found"> {
	const approval = await getApproval(db, approvalId);
	if (!approval) return "not_found";

	if (approval.status !== "pending") return "already_resolved";

	if (new Date(approval.expiresAt) < new Date()) {
		await db
			.update(pendingApprovals)
			.set({ status: "expired" })
			.where(
				and(
					eq(pendingApprovals.id, approvalId),
					eq(pendingApprovals.status, "pending"),
				),
			);
		return "expired";
	}

	const result = await db
		.update(pendingApprovals)
		.set({ status: action })
		.where(
			and(
				eq(pendingApprovals.id, approvalId),
				eq(pendingApprovals.status, "pending"),
			),
		)
		.returning({ id: pendingApprovals.id });

	return result.length > 0 ? "resolved" : "already_resolved";
}

export interface ApprovalContext {
	toolName: string;
	toolInput: string;
	status: "pending" | "approved" | "rejected" | "expired";
	createdAt: string;
}

const RECENT_MINUTES = 30;

export async function getRecentApprovals(
	db: Db,
	chatId: string,
): Promise<ApprovalContext[]> {
	const cutoff = new Date(Date.now() - RECENT_MINUTES * 60_000).toISOString();

	const rows = await db
		.select({
			toolName: pendingApprovals.toolName,
			toolInput: pendingApprovals.toolInput,
			status: pendingApprovals.status,
			createdAt: pendingApprovals.createdAt,
			expiresAt: pendingApprovals.expiresAt,
		})
		.from(pendingApprovals)
		.where(
			and(
				eq(pendingApprovals.chatId, chatId),
				gte(pendingApprovals.createdAt, cutoff),
			),
		)
		.orderBy(desc(pendingApprovals.createdAt))
		.limit(5);

	const now = new Date();
	return rows.map((row) => ({
		toolName: row.toolName,
		toolInput: row.toolInput,
		status:
			row.status === "pending" && new Date(row.expiresAt) < now
				? "expired"
				: (row.status as ApprovalContext["status"]),
		createdAt: row.createdAt,
	}));
}
