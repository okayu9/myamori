import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { createDb } from "../db";
import { calendarUids } from "../db/schema";

type Db = ReturnType<typeof createDb>;

import type { CalendarClient } from "./calendar-client";
import type { ToolDefinition } from "./types";
import { defineTool } from "./types";

interface ParsedEvent {
	uid: string;
	summary: string;
	dtstart: string;
	dtend: string;
	allDay: boolean;
}

function parseICalEvents(icalData: string): ParsedEvent[] {
	const events: ParsedEvent[] = [];
	const eventBlocks = icalData.split("BEGIN:VEVENT");

	for (let i = 1; i < eventBlocks.length; i++) {
		const rawBlock = eventBlocks[i];
		if (!rawBlock) continue;
		const block = rawBlock.split("END:VEVENT")[0];
		if (!block) continue;

		const uid = extractProperty(block, "UID") ?? "";
		const summary = extractProperty(block, "SUMMARY") ?? "";
		const dtstartRaw = extractPropertyWithParams(block, "DTSTART");
		const dtendRaw = extractPropertyWithParams(block, "DTEND");

		const allDay =
			dtstartRaw?.params?.includes("VALUE=DATE") === true &&
			!dtstartRaw.params.includes("VALUE=DATE-TIME");

		events.push({
			uid,
			summary,
			dtstart: formatDateTime(dtstartRaw?.value ?? "", allDay),
			dtend: formatDateTime(dtendRaw?.value ?? "", allDay),
			allDay,
		});
	}
	return events;
}

function extractProperty(block: string, name: string): string | undefined {
	const regex = new RegExp(`^${name}[;:](.*)$`, "m");
	const match = block.match(regex);
	if (!match?.[1]) return undefined;
	const value = match[1];
	// Handle properties with parameters (e.g., DTSTART;VALUE=DATE:20250301)
	const colonIdx = value.indexOf(":");
	if (
		colonIdx >= 0 &&
		name !== "UID" &&
		name !== "SUMMARY" &&
		name !== "DESCRIPTION"
	) {
		return value.slice(colonIdx + 1).trim();
	}
	return value.trim();
}

function extractPropertyWithParams(
	block: string,
	name: string,
): { params: string; value: string } | undefined {
	const regex = new RegExp(`^${name}([;:].*)$`, "m");
	const match = block.match(regex);
	if (!match?.[1]) return undefined;
	const raw = match[1];
	const lastColon = raw.lastIndexOf(":");
	if (lastColon < 0) return { params: "", value: raw.trim() };
	return {
		params: raw.slice(0, lastColon),
		value: raw.slice(lastColon + 1).trim(),
	};
}

function escapeICalText(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n");
}

function formatDateTime(value: string, allDay: boolean): string {
	if (!value) return "";
	if (allDay && value.length === 8) {
		// YYYYMMDD → YYYY-MM-DD
		return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
	}
	// YYYYMMDDTHHmmssZ or YYYYMMDDTHHmmss → ISO 8601
	if (value.length >= 15) {
		const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}`;
		if (value.endsWith("Z")) return `${iso}Z`;
		return iso;
	}
	return value;
}

const dateRangeSchema = z.object({
	startDate: z
		.string()
		.describe("Start date in ISO 8601 format (e.g., 2025-03-01)"),
	endDate: z
		.string()
		.describe("End date in ISO 8601 format (e.g., 2025-03-07)"),
});

export function createCalendarTools(
	client: CalendarClient,
	db: Db,
): ToolDefinition[] {
	const getEventsAvailability = defineTool({
		name: "get_events_availability",
		description:
			"Check calendar availability for a date range. Returns only time slots (start, end, all-day flag) without titles or details.",
		inputSchema: dateRangeSchema,
		riskLevel: "low",
		execute: async (input) => {
			const objects = await client.davClient.fetchCalendarObjects({
				calendar: client.calendar,
				timeRange: {
					start: new Date(input.startDate).toISOString(),
					end: new Date(input.endDate).toISOString(),
				},
			});

			const slots = [];
			for (const obj of objects) {
				if (!obj.data) continue;
				const events = parseICalEvents(obj.data);
				for (const event of events) {
					slots.push({
						start: event.dtstart,
						end: event.dtend,
						allDay: event.allDay,
					});
				}
			}
			return { slots };
		},
	});

	const getEventsDetails = defineTool({
		name: "get_events_details",
		description:
			"Get calendar event details for a date range. Returns full details for AI-created events immediately. User-created events require approval.",
		inputSchema: dateRangeSchema,
		riskLevel: "low",
		execute: async (input) => {
			const objects = await client.davClient.fetchCalendarObjects({
				calendar: client.calendar,
				timeRange: {
					start: new Date(input.startDate).toISOString(),
					end: new Date(input.endDate).toISOString(),
				},
			});

			const allEvents: ParsedEvent[] = [];
			for (const obj of objects) {
				if (!obj.data) continue;
				allEvents.push(...parseICalEvents(obj.data));
			}

			const aiCreatedRows = await db.select().from(calendarUids);
			const aiCreatedUids = new Set(aiCreatedRows.map((r) => r.eventUid));

			const accessible: Array<{
				uid: string;
				title: string;
				start: string;
				end: string;
				allDay: boolean;
			}> = [];
			let userCreatedCount = 0;

			for (const event of allEvents) {
				if (aiCreatedUids.has(event.uid)) {
					accessible.push({
						uid: event.uid,
						title: event.summary,
						start: event.dtstart,
						end: event.dtend,
						allDay: event.allDay,
					});
				} else {
					userCreatedCount++;
				}
			}

			return {
				events: accessible,
				userCreatedEventsRequiringApproval: userCreatedCount,
				message:
					userCreatedCount > 0
						? `${userCreatedCount} user-created event(s) require approval to view details.`
						: undefined,
			};
		},
	});

	const createEventSchema = z.object({
		title: z.string().describe("Event title"),
		startTime: z.string().describe("Start time in ISO 8601 format"),
		endTime: z.string().describe("End time in ISO 8601 format"),
		allDay: z.boolean().optional().describe("Whether this is an all-day event"),
	});

	const createEvent = defineTool({
		name: "create_event",
		description:
			"Create a new calendar event. Requires approval before execution.",
		inputSchema: createEventSchema,
		riskLevel: "high",
		execute: async (input) => {
			const uid = `${nanoid()}@myamori`;
			const now = new Date()
				.toISOString()
				.replace(/[-:]/g, "")
				.replace(/\.\d{3}/, "");

			let dtstart: string;
			let dtend: string;
			if (input.allDay) {
				dtstart = `DTSTART;VALUE=DATE:${input.startTime.replace(/-/g, "").slice(0, 8)}`;
				dtend = `DTEND;VALUE=DATE:${input.endTime.replace(/-/g, "").slice(0, 8)}`;
			} else {
				dtstart = `DTSTART:${input.startTime.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
				dtend = `DTEND:${input.endTime.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
			}

			const ical = [
				"BEGIN:VCALENDAR",
				"VERSION:2.0",
				"PRODID:-//myamori//EN",
				"BEGIN:VEVENT",
				`UID:${uid}`,
				`DTSTAMP:${now}`,
				dtstart,
				dtend,
				`SUMMARY:${escapeICalText(input.title)}`,
				"END:VEVENT",
				"END:VCALENDAR",
			].join("\r\n");

			await client.davClient.createCalendarObject({
				calendar: client.calendar,
				filename: `${uid}.ics`,
				iCalString: ical,
			});

			await db.insert(calendarUids).values({
				id: nanoid(),
				eventUid: uid,
				createdAt: new Date().toISOString(),
			});

			return { uid, title: input.title, created: true };
		},
	});

	const updateEventSchema = z.object({
		uid: z.string().describe("Event UID to update"),
		title: z.string().optional().describe("New event title"),
		startTime: z.string().optional().describe("New start time in ISO 8601"),
		endTime: z.string().optional().describe("New end time in ISO 8601"),
		allDay: z.boolean().optional().describe("Whether this is an all-day event"),
	});

	const updateEvent = defineTool({
		name: "update_event",
		description:
			"Update an existing calendar event. Requires approval before execution.",
		inputSchema: updateEventSchema,
		riskLevel: "high",
		execute: async (input) => {
			const objects = await client.davClient.fetchCalendarObjects({
				calendar: client.calendar,
			});

			const targetObj = objects.find(
				(obj) =>
					obj.data &&
					parseICalEvents(obj.data).some((e) => e.uid === input.uid),
			);
			if (!targetObj) {
				throw new Error(`Event with UID "${input.uid}" not found`);
			}

			const existing = parseICalEvents(targetObj.data)[0];
			if (!existing) {
				throw new Error(`Could not parse event with UID "${input.uid}"`);
			}

			const title = input.title ?? existing.summary;
			const startTime = input.startTime ?? existing.dtstart;
			const endTime = input.endTime ?? existing.dtend;
			const allDay = input.allDay ?? existing.allDay;

			const now = new Date()
				.toISOString()
				.replace(/[-:]/g, "")
				.replace(/\.\d{3}/, "");

			let dtstart: string;
			let dtend: string;
			if (allDay) {
				dtstart = `DTSTART;VALUE=DATE:${startTime.replace(/-/g, "").slice(0, 8)}`;
				dtend = `DTEND;VALUE=DATE:${endTime.replace(/-/g, "").slice(0, 8)}`;
			} else {
				dtstart = `DTSTART:${startTime.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
				dtend = `DTEND:${endTime.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
			}

			const ical = [
				"BEGIN:VCALENDAR",
				"VERSION:2.0",
				"PRODID:-//myamori//EN",
				"BEGIN:VEVENT",
				`UID:${input.uid}`,
				`DTSTAMP:${now}`,
				dtstart,
				dtend,
				`SUMMARY:${escapeICalText(title)}`,
				"END:VEVENT",
				"END:VCALENDAR",
			].join("\r\n");

			await client.davClient.updateCalendarObject({
				calendarObject: {
					url: targetObj.url,
					etag: targetObj.etag,
					data: ical,
				},
			});

			return { uid: input.uid, updated: true };
		},
	});

	const deleteEventSchema = z.object({
		uid: z.string().describe("Event UID to delete"),
	});

	const deleteEvent = defineTool({
		name: "delete_event",
		description: "Delete a calendar event. Requires approval before execution.",
		inputSchema: deleteEventSchema,
		riskLevel: "high",
		execute: async (input) => {
			const objects = await client.davClient.fetchCalendarObjects({
				calendar: client.calendar,
			});

			const targetObj = objects.find(
				(obj) =>
					obj.data &&
					parseICalEvents(obj.data).some((e) => e.uid === input.uid),
			);
			if (!targetObj) {
				throw new Error(`Event with UID "${input.uid}" not found`);
			}

			await client.davClient.deleteCalendarObject({
				calendarObject: { url: targetObj.url, etag: targetObj.etag },
			});

			// Clean up UID tracking if this was an AI-created event
			await db.delete(calendarUids).where(eq(calendarUids.eventUid, input.uid));

			return { uid: input.uid, deleted: true };
		},
	});

	return [
		getEventsAvailability,
		getEventsDetails,
		createEvent,
		updateEvent,
		deleteEvent,
	];
}

export { parseICalEvents, formatDateTime };
