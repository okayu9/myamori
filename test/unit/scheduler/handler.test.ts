import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../../src/db";
import { scheduledJobs } from "../../../src/db/schema";
import { handleScheduledEvent } from "../../../src/scheduler/handler";

function getDb() {
	return createDb(env.DB);
}

async function insertJob(
	db: ReturnType<typeof getDb>,
	overrides: Partial<typeof scheduledJobs.$inferInsert> = {},
) {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	await db.insert(scheduledJobs).values({
		id,
		name: "test-job",
		cronExpr: "*/5 * * * *",
		prompt: "Run test",
		chatId: "chat-1",
		enabled: 1,
		nextRunAt: new Date(Date.now() - 60_000).toISOString(), // 1 minute ago = due
		createdAt: now,
		updatedAt: now,
		...overrides,
	});
	return id;
}

describe("handleScheduledEvent", () => {
	beforeEach(async () => {
		const db = getDb();
		await db.delete(scheduledJobs);
	});
	it("enqueues due jobs to the queue", async () => {
		const db = getDb();
		const jobId = await insertJob(db);

		const sentMessages: unknown[] = [];
		const mockQueue = {
			sendBatch: async (msgs: unknown[]) => {
				sentMessages.push(...msgs);
			},
		} as unknown as Queue;

		await handleScheduledEvent({
			DB: env.DB,
			SCHEDULER_QUEUE: mockQueue,
		});

		expect(sentMessages.length).toBeGreaterThanOrEqual(1);
		const sent = sentMessages.find(
			(m: unknown) => (m as { body: { jobId: string } }).body.jobId === jobId,
		) as { body: { jobId: string; chatId: string; prompt: string } };
		expect(sent).toBeDefined();
		expect(sent.body.chatId).toBe("chat-1");
		expect(sent.body.prompt).toBe("Run test");
	});

	it("updates nextRunAt after enqueuing", async () => {
		const db = getDb();
		const jobId = await insertJob(db);

		const mockQueue = {
			sendBatch: async () => {},
		} as unknown as Queue;

		await handleScheduledEvent({
			DB: env.DB,
			SCHEDULER_QUEUE: mockQueue,
		});

		const [updated] = await db
			.select()
			.from(scheduledJobs)
			.where(eq(scheduledJobs.id, jobId));

		expect(updated).toBeDefined();
		// nextRunAt should now be in the future
		// biome-ignore lint/style/noNonNullAssertion: asserted above
		expect(new Date(updated!.nextRunAt).getTime()).toBeGreaterThan(
			Date.now() - 1000,
		);
	});

	it("does nothing when no jobs are due", async () => {
		const db = getDb();
		// Insert a job that's not due yet
		await insertJob(db, {
			nextRunAt: new Date(Date.now() + 3_600_000).toISOString(), // 1 hour from now
		});

		let sendBatchCalled = false;
		const mockQueue = {
			sendBatch: async () => {
				sendBatchCalled = true;
			},
		} as unknown as Queue;

		await handleScheduledEvent({
			DB: env.DB,
			SCHEDULER_QUEUE: mockQueue,
		});

		expect(sendBatchCalled).toBe(false);
	});

	it("skips disabled jobs", async () => {
		const db = getDb();
		await insertJob(db, { enabled: 0 });

		let sendBatchCalled = false;
		const mockQueue = {
			sendBatch: async () => {
				sendBatchCalled = true;
			},
		} as unknown as Queue;

		await handleScheduledEvent({
			DB: env.DB,
			SCHEDULER_QUEUE: mockQueue,
		});

		expect(sendBatchCalled).toBe(false);
	});
});
