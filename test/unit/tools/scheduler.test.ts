import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "../../../src/db";
import { scheduledJobs } from "../../../src/db/schema";
import { createSchedulerTools } from "../../../src/tools/scheduler";

function getDb() {
	return createDb(env.DB);
}

describe("scheduler tools", () => {
	describe("list_scheduled_jobs", () => {
		it("returns empty list when no jobs exist", async () => {
			const db = getDb();
			const tools = createSchedulerTools(db, "chat-1");
			const tool = tools.find((t) => t.name === "list_scheduled_jobs");
			expect(tool).toBeDefined();

			const result = (await tool?.execute({})) as {
				jobs: unknown[];
			};
			expect(result.jobs).toEqual([]);
		});

		it("returns all jobs", async () => {
			const db = getDb();
			const id = crypto.randomUUID();
			const now = new Date().toISOString();
			await db.insert(scheduledJobs).values({
				id,
				name: "Morning briefing",
				cronExpr: "0 9 * * *",
				prompt: "Give me a morning briefing",
				chatId: "chat-1",
				enabled: 1,
				nextRunAt: new Date(Date.now() + 3600000).toISOString(),
				createdAt: now,
				updatedAt: now,
			});

			const tools = createSchedulerTools(db, "chat-1");
			const tool = tools.find((t) => t.name === "list_scheduled_jobs");

			const result = (await tool?.execute({})) as {
				jobs: Array<{ id: string; name: string; enabled: boolean }>;
			};

			const job = result.jobs.find((j) => j.id === id);
			expect(job).toBeDefined();
			expect(job?.name).toBe("Morning briefing");
			expect(job?.enabled).toBe(true);
		});
	});

	describe("create_scheduled_job", () => {
		it("creates a job with valid cron", async () => {
			const db = getDb();
			const tools = createSchedulerTools(db, "chat-1", 42);
			const tool = tools.find((t) => t.name === "create_scheduled_job");
			expect(tool).toBeDefined();

			const result = (await tool?.execute({
				name: "Test job",
				cronExpr: "0 9 * * *",
				prompt: "Hello",
			})) as {
				id: string;
				name: string;
				cronExpr: string;
				nextRunAt: string;
				created: boolean;
			};

			expect(result.created).toBe(true);
			expect(result.name).toBe("Test job");
			expect(result.cronExpr).toBe("0 9 * * *");
			expect(result.nextRunAt).toBeTruthy();

			// Verify in DB
			const [row] = await db
				.select()
				.from(scheduledJobs)
				.where(eq(scheduledJobs.id, result.id));
			expect(row).toBeDefined();
			expect(row?.chatId).toBe("chat-1");
			expect(row?.threadId).toBe(42);
			expect(row?.enabled).toBe(1);
		});

		it("rejects invalid cron expression", async () => {
			const db = getDb();
			const tools = createSchedulerTools(db, "chat-1");
			const tool = tools.find((t) => t.name === "create_scheduled_job");

			await expect(
				tool?.execute({
					name: "Bad job",
					cronExpr: "invalid",
					prompt: "Hello",
				}),
			).rejects.toThrow();
		});

		it("computes nextRunAt correctly", async () => {
			const db = getDb();
			const tools = createSchedulerTools(db, "chat-1");
			const tool = tools.find((t) => t.name === "create_scheduled_job");

			const result = (await tool?.execute({
				name: "Future job",
				cronExpr: "0 0 1 1 *",
				prompt: "New year",
			})) as { nextRunAt: string };

			const nextRun = new Date(result.nextRunAt);
			expect(nextRun.getUTCMonth()).toBe(0); // January
			expect(nextRun.getUTCDate()).toBe(1);
			expect(nextRun.getUTCHours()).toBe(0);
		});
	});

	describe("update_scheduled_job", () => {
		it("updates job fields", async () => {
			const db = getDb();
			const id = crypto.randomUUID();
			const now = new Date().toISOString();
			await db.insert(scheduledJobs).values({
				id,
				name: "Original",
				cronExpr: "0 9 * * *",
				prompt: "Original prompt",
				chatId: "chat-1",
				enabled: 1,
				nextRunAt: new Date(Date.now() + 3600000).toISOString(),
				createdAt: now,
				updatedAt: now,
			});

			const tools = createSchedulerTools(db, "chat-1");
			const tool = tools.find((t) => t.name === "update_scheduled_job");

			const result = (await tool?.execute({
				jobId: id,
				name: "Updated",
				enabled: false,
			})) as { jobId: string; updated: boolean };

			expect(result.updated).toBe(true);

			const [row] = await db
				.select()
				.from(scheduledJobs)
				.where(eq(scheduledJobs.id, id));
			expect(row?.name).toBe("Updated");
			expect(row?.enabled).toBe(0);
		});

		it("throws for nonexistent job", async () => {
			const db = getDb();
			const tools = createSchedulerTools(db, "chat-1");
			const tool = tools.find((t) => t.name === "update_scheduled_job");

			await expect(
				tool?.execute({ jobId: "nonexistent", name: "x" }),
			).rejects.toThrow("Job not found");
		});

		it("recomputes nextRunAt when cron changes", async () => {
			const db = getDb();
			const id = crypto.randomUUID();
			const now = new Date().toISOString();
			await db.insert(scheduledJobs).values({
				id,
				name: "Cron change test",
				cronExpr: "0 9 * * *",
				prompt: "Test",
				chatId: "chat-1",
				enabled: 1,
				nextRunAt: now,
				createdAt: now,
				updatedAt: now,
			});

			const tools = createSchedulerTools(db, "chat-1");
			const tool = tools.find((t) => t.name === "update_scheduled_job");

			await tool?.execute({
				jobId: id,
				cronExpr: "0 0 1 * *",
			});

			const [row] = await db
				.select()
				.from(scheduledJobs)
				.where(eq(scheduledJobs.id, id));
			expect(row?.cronExpr).toBe("0 0 1 * *");
			// nextRunAt should be on the 1st of a month at midnight
			// biome-ignore lint/style/noNonNullAssertion: asserted by expect above
			const nextRun = new Date(row!.nextRunAt);
			expect(nextRun.getUTCDate()).toBe(1);
			expect(nextRun.getUTCHours()).toBe(0);
		});
	});

	describe("delete_scheduled_job", () => {
		it("deletes an existing job", async () => {
			const db = getDb();
			const id = crypto.randomUUID();
			const now = new Date().toISOString();
			await db.insert(scheduledJobs).values({
				id,
				name: "To delete",
				cronExpr: "0 9 * * *",
				prompt: "Delete me",
				chatId: "chat-1",
				enabled: 1,
				nextRunAt: new Date(Date.now() + 3600000).toISOString(),
				createdAt: now,
				updatedAt: now,
			});

			const tools = createSchedulerTools(db, "chat-1");
			const tool = tools.find((t) => t.name === "delete_scheduled_job");

			const result = (await tool?.execute({ jobId: id })) as {
				jobId: string;
				deleted: boolean;
			};

			expect(result.deleted).toBe(true);

			const rows = await db
				.select()
				.from(scheduledJobs)
				.where(eq(scheduledJobs.id, id));
			expect(rows).toHaveLength(0);
		});

		it("throws for nonexistent job", async () => {
			const db = getDb();
			const tools = createSchedulerTools(db, "chat-1");
			const tool = tools.find((t) => t.name === "delete_scheduled_job");

			await expect(tool?.execute({ jobId: "nonexistent" })).rejects.toThrow(
				"Job not found",
			);
		});
	});
});
