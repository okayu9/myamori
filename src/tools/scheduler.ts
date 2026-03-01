import { eq } from "drizzle-orm";
import { z } from "zod";
import type { createDb } from "../db";
import { scheduledJobs } from "../db/schema";
import { getNextRun, parseCron } from "../scheduler/cron";
import type { ToolDefinition } from "./types";
import { defineTool } from "./types";

export function createSchedulerTools(
	db: ReturnType<typeof createDb>,
	chatId: string,
	threadId?: number,
): ToolDefinition[] {
	const listScheduledJobs = defineTool({
		name: "list_scheduled_jobs",
		description:
			"List all scheduled jobs. Returns job details including name, cron expression, prompt, enabled status, and next run time.",
		inputSchema: z.object({}),
		riskLevel: "low",
		execute: async () => {
			const jobs = await db
				.select()
				.from(scheduledJobs)
				.where(eq(scheduledJobs.chatId, chatId));
			return {
				jobs: jobs.map((job) => ({
					id: job.id,
					name: job.name,
					cronExpr: job.cronExpr,
					prompt: job.prompt,
					enabled: job.enabled === 1,
					nextRunAt: job.nextRunAt,
					createdAt: job.createdAt,
					updatedAt: job.updatedAt,
				})),
			};
		},
	});

	const createScheduledJob = defineTool({
		name: "create_scheduled_job",
		description:
			"Create a new scheduled job. Uses a 5-field cron expression (minute hour day-of-month month day-of-week). Supports numbers, *, commas (,), ranges (-), and steps (/). Examples: '0 9 * * *' (daily 9am UTC), '*/30 * * * *' (every 30 min), '0 9 * * 1-5' (weekdays 9am UTC). Requires approval.",
		inputSchema: z.object({
			name: z.string().describe("Human-readable name for the job"),
			cronExpr: z
				.string()
				.describe("5-field cron expression (minute hour dom month dow)"),
			prompt: z
				.string()
				.describe("Message to send to the assistant when the job runs"),
		}),
		riskLevel: "high",
		execute: async (input) => {
			// Validate cron expression
			parseCron(input.cronExpr);

			const now = new Date();
			const nextRunAt = getNextRun(input.cronExpr, now);
			const id = crypto.randomUUID();
			const nowIso = now.toISOString();

			await db.insert(scheduledJobs).values({
				id,
				name: input.name,
				cronExpr: input.cronExpr,
				prompt: input.prompt,
				chatId,
				threadId,
				enabled: 1,
				nextRunAt: nextRunAt.toISOString(),
				createdAt: nowIso,
				updatedAt: nowIso,
			});

			return {
				id,
				name: input.name,
				cronExpr: input.cronExpr,
				nextRunAt: nextRunAt.toISOString(),
				created: true,
			};
		},
	});

	const updateScheduledJob = defineTool({
		name: "update_scheduled_job",
		description:
			"Update an existing scheduled job. Can change name, cron expression, prompt, or enabled status. Requires approval.",
		inputSchema: z.object({
			jobId: z.string().describe("ID of the job to update"),
			name: z.string().optional().describe("New name for the job"),
			cronExpr: z.string().optional().describe("New cron expression"),
			prompt: z.string().optional().describe("New prompt for the job"),
			enabled: z.boolean().optional().describe("Enable or disable the job"),
		}),
		riskLevel: "high",
		execute: async (input) => {
			const existing = await db
				.select({ id: scheduledJobs.id })
				.from(scheduledJobs)
				.where(eq(scheduledJobs.id, input.jobId))
				.limit(1);

			if (existing.length === 0) {
				throw new Error(`Job not found: ${input.jobId}`);
			}

			const updates: Record<string, unknown> = {
				updatedAt: new Date().toISOString(),
			};

			if (input.name !== undefined) {
				updates.name = input.name;
			}
			if (input.prompt !== undefined) {
				updates.prompt = input.prompt;
			}
			if (input.enabled !== undefined) {
				updates.enabled = input.enabled ? 1 : 0;
			}
			if (input.cronExpr !== undefined) {
				parseCron(input.cronExpr);
				updates.cronExpr = input.cronExpr;
				updates.nextRunAt = getNextRun(
					input.cronExpr,
					new Date(),
				).toISOString();
			}

			await db
				.update(scheduledJobs)
				.set(updates)
				.where(eq(scheduledJobs.id, input.jobId));

			return { jobId: input.jobId, updated: true };
		},
	});

	const deleteScheduledJob = defineTool({
		name: "delete_scheduled_job",
		description: "Delete a scheduled job. Requires approval.",
		inputSchema: z.object({
			jobId: z.string().describe("ID of the job to delete"),
		}),
		riskLevel: "high",
		execute: async (input) => {
			const existing = await db
				.select({ id: scheduledJobs.id })
				.from(scheduledJobs)
				.where(eq(scheduledJobs.id, input.jobId))
				.limit(1);

			if (existing.length === 0) {
				throw new Error(`Job not found: ${input.jobId}`);
			}

			await db.delete(scheduledJobs).where(eq(scheduledJobs.id, input.jobId));

			return { jobId: input.jobId, deleted: true };
		},
	});

	return [
		listScheduledJobs,
		createScheduledJob,
		updateScheduledJob,
		deleteScheduledJob,
	];
}
