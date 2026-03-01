import { and, eq, lte } from "drizzle-orm";
import { createDb } from "../db";
import { scheduledJobs } from "../db/schema";
import { getNextRun } from "./cron";

export interface SchedulerEnv {
	DB: D1Database;
	SCHEDULER_QUEUE: Queue;
}

export interface SchedulerJobMessage {
	jobId: string;
	chatId: string;
	prompt: string;
	threadId?: number;
}

export async function handleScheduledEvent(env: SchedulerEnv): Promise<void> {
	const db = createDb(env.DB);

	const now = new Date().toISOString();

	const dueJobs = await db
		.select()
		.from(scheduledJobs)
		.where(
			and(eq(scheduledJobs.enabled, 1), lte(scheduledJobs.nextRunAt, now)),
		);

	if (dueJobs.length === 0) {
		return;
	}

	const messages: MessageSendRequest<SchedulerJobMessage>[] = dueJobs.map(
		(job) => ({
			body: {
				jobId: job.id,
				chatId: job.chatId,
				prompt: job.prompt,
				threadId: job.threadId ?? undefined,
			},
		}),
	);

	await env.SCHEDULER_QUEUE.sendBatch(messages);

	for (const job of dueJobs) {
		const nextRunAt = getNextRun(job.cronExpr, new Date()).toISOString();
		await db
			.update(scheduledJobs)
			.set({ nextRunAt, updatedAt: new Date().toISOString() })
			.where(eq(scheduledJobs.id, job.id));
	}
}
