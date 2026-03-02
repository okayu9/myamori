import { createDb } from "../db";
import { createCalendarTools } from "./calendar";
import { createCalendarClient } from "./calendar-client";
import { createEmailTools } from "./email";
import { createFileTools } from "./files";
import { ToolRegistry } from "./registry";
import { createSchedulerTools } from "./scheduler";
import { createWebSearchTool } from "./web-search";

export interface ToolRegistryEnv {
	DB: D1Database;
	TAVILY_API_KEY?: string;
	FILE_BUCKET?: R2Bucket;
	CALDAV_URL?: string;
	CALDAV_USERNAME?: string;
	CALDAV_PASSWORD?: string;
	CALDAV_CALENDAR_NAME?: string;
}

export async function buildToolRegistry(
	env: ToolRegistryEnv,
	chatId?: string,
	threadId?: number,
): Promise<ToolRegistry> {
	const registry = new ToolRegistry();

	if (env.TAVILY_API_KEY?.trim()) {
		registry.register(createWebSearchTool(env.TAVILY_API_KEY));
	}

	if (env.FILE_BUCKET) {
		for (const tool of createFileTools(env.FILE_BUCKET)) {
			registry.register(tool);
		}
		const emailDb = createDb(env.DB);
		for (const tool of createEmailTools(emailDb, env.FILE_BUCKET)) {
			registry.register(tool);
		}
	}

	if (env.CALDAV_URL?.trim()) {
		if (!env.CALDAV_USERNAME?.trim() || !env.CALDAV_PASSWORD?.trim()) {
			console.error(
				"CALDAV_URL is set but credentials are missing; skipping calendar tools",
			);
		} else {
			try {
				const calClient = await createCalendarClient({
					CALDAV_URL: env.CALDAV_URL,
					CALDAV_USERNAME: env.CALDAV_USERNAME,
					CALDAV_PASSWORD: env.CALDAV_PASSWORD,
					CALDAV_CALENDAR_NAME: env.CALDAV_CALENDAR_NAME,
				});
				const calDb = createDb(env.DB);
				for (const tool of createCalendarTools(calClient, calDb)) {
					registry.register(tool);
				}
			} catch (error) {
				console.error(
					"Failed to initialize calendar tools; continuing without them:",
					error,
				);
			}
		}
	}

	if (chatId) {
		const db = createDb(env.DB);
		for (const tool of createSchedulerTools(db, chatId, threadId)) {
			registry.register(tool);
		}
	}

	return registry;
}
