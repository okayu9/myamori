import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createDb } from "../../../src/db";
import { calendarUids } from "../../../src/db/schema";
import { createCalendarTools } from "../../../src/tools/calendar";
import type { CalendarClient } from "../../../src/tools/calendar-client";

function makeICalEvent(opts: {
	uid: string;
	summary: string;
	dtstart: string;
	dtend: string;
	allDay?: boolean;
}): string {
	const dts = opts.allDay
		? `DTSTART;VALUE=DATE:${opts.dtstart}`
		: `DTSTART:${opts.dtstart}`;
	const dte = opts.allDay
		? `DTEND;VALUE=DATE:${opts.dtend}`
		: `DTEND:${opts.dtend}`;
	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"BEGIN:VEVENT",
		`UID:${opts.uid}`,
		`DTSTAMP:20250301T000000Z`,
		dts,
		dte,
		`SUMMARY:${opts.summary}`,
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
}

function createMockClient(
	calendarObjects: Array<{ data: string; url: string; etag: string }>,
): CalendarClient {
	return {
		davClient: {
			fetchCalendarObjects: vi.fn().mockResolvedValue(calendarObjects),
			createCalendarObject: vi
				.fn()
				.mockResolvedValue(new Response("", { status: 201 })),
			updateCalendarObject: vi
				.fn()
				.mockResolvedValue(new Response("", { status: 204 })),
			deleteCalendarObject: vi
				.fn()
				.mockResolvedValue(new Response("", { status: 204 })),
		},
		calendar: { url: "/cal/test/", displayName: "Test Calendar" },
	} as unknown as CalendarClient;
}

describe("calendar tools", () => {
	function getDb() {
		return createDb(env.DB);
	}

	describe("get_events_availability", () => {
		it("returns time slots without titles", async () => {
			const mockClient = createMockClient([
				{
					data: makeICalEvent({
						uid: "evt-1",
						summary: "Secret Meeting",
						dtstart: "20250305T100000Z",
						dtend: "20250305T110000Z",
					}),
					url: "/cal/evt-1.ics",
					etag: '"etag1"',
				},
			]);
			const db = getDb();
			const tools = createCalendarTools(mockClient, db);
			const tool = tools.find((t) => t.name === "get_events_availability");
			expect(tool).toBeDefined();

			const result = (await tool?.execute({
				startDate: "2025-03-01",
				endDate: "2025-03-07",
			})) as { slots: Array<{ start: string; end: string; allDay: boolean }> };

			expect(result.slots).toHaveLength(1);
			expect(result.slots[0]).toEqual({
				start: "2025-03-05T10:00:00Z",
				end: "2025-03-05T11:00:00Z",
				allDay: false,
			});
			// Should NOT include title/summary
			expect(result.slots[0]).not.toHaveProperty("title");
			expect(result.slots[0]).not.toHaveProperty("summary");
		});

		it("handles all-day events", async () => {
			const mockClient = createMockClient([
				{
					data: makeICalEvent({
						uid: "evt-allday",
						summary: "Holiday",
						dtstart: "20250310",
						dtend: "20250311",
						allDay: true,
					}),
					url: "/cal/evt-allday.ics",
					etag: '"etag2"',
				},
			]);
			const db = getDb();
			const tools = createCalendarTools(mockClient, db);
			const tool = tools.find((t) => t.name === "get_events_availability");

			const result = (await tool?.execute({
				startDate: "2025-03-10",
				endDate: "2025-03-11",
			})) as { slots: Array<{ start: string; end: string; allDay: boolean }> };

			expect(result.slots[0]?.allDay).toBe(true);
			expect(result.slots[0]?.start).toBe("2025-03-10");
		});
	});

	describe("get_events_details", () => {
		it("returns AI-created event details immediately", async () => {
			const db = getDb();
			// Pre-insert AI-created UID
			await db.insert(calendarUids).values({
				id: "id-1",
				eventUid: "ai-evt-1",
				createdAt: new Date().toISOString(),
			});

			const mockClient = createMockClient([
				{
					data: makeICalEvent({
						uid: "ai-evt-1",
						summary: "AI Created Meeting",
						dtstart: "20250305T140000Z",
						dtend: "20250305T150000Z",
					}),
					url: "/cal/ai-evt-1.ics",
					etag: '"etag3"',
				},
			]);
			const tools = createCalendarTools(mockClient, db);
			const tool = tools.find((t) => t.name === "get_events_details");

			const result = (await tool?.execute({
				startDate: "2025-03-01",
				endDate: "2025-03-07",
			})) as {
				events: Array<{ uid: string; title: string }>;
				userCreatedEventsRequiringApproval: number;
			};

			expect(result.events).toHaveLength(1);
			expect(result.events[0]?.title).toBe("AI Created Meeting");
			expect(result.userCreatedEventsRequiringApproval).toBe(0);
		});

		it("excludes user-created events and reports count", async () => {
			const db = getDb();
			const mockClient = createMockClient([
				{
					data: makeICalEvent({
						uid: "user-evt-1",
						summary: "User's Private Event",
						dtstart: "20250306T090000Z",
						dtend: "20250306T100000Z",
					}),
					url: "/cal/user-evt-1.ics",
					etag: '"etag4"',
				},
			]);
			const tools = createCalendarTools(mockClient, db);
			const tool = tools.find((t) => t.name === "get_events_details");

			const result = (await tool?.execute({
				startDate: "2025-03-01",
				endDate: "2025-03-07",
			})) as {
				events: Array<{ uid: string; title: string }>;
				userCreatedEventsRequiringApproval: number;
				message: string;
			};

			expect(result.events).toHaveLength(0);
			expect(result.userCreatedEventsRequiringApproval).toBe(1);
			expect(result.message).toContain("1 user-created event(s)");
		});
	});

	describe("create_event", () => {
		it("creates event and records UID in D1", async () => {
			const db = getDb();
			const mockClient = createMockClient([]);
			const tools = createCalendarTools(mockClient, db);
			const tool = tools.find((t) => t.name === "create_event");

			const result = (await tool?.execute({
				title: "New Meeting",
				startTime: "2025-03-10T10:00:00Z",
				endTime: "2025-03-10T11:00:00Z",
			})) as { uid: string; created: boolean };

			expect(result.created).toBe(true);
			expect(result.uid).toBeTruthy();

			// Verify UID was saved in D1
			const rows = await db
				.select()
				.from(calendarUids)
				.where(eq(calendarUids.eventUid, result.uid));
			expect(rows).toHaveLength(1);

			// Verify CalDAV was called
			expect(mockClient.davClient.createCalendarObject).toHaveBeenCalled();
		});
	});

	describe("update_event", () => {
		it("updates an existing event", async () => {
			const db = getDb();
			const mockClient = createMockClient([
				{
					data: makeICalEvent({
						uid: "upd-evt-1",
						summary: "Original Title",
						dtstart: "20250310T100000Z",
						dtend: "20250310T110000Z",
					}),
					url: "/cal/upd-evt-1.ics",
					etag: '"etag-upd"',
				},
			]);
			const tools = createCalendarTools(mockClient, db);
			const tool = tools.find((t) => t.name === "update_event");
			expect(tool).toBeDefined();

			const result = (await tool?.execute({
				uid: "upd-evt-1",
				title: "Updated Title",
				startTime: "2025-03-10T14:00:00Z",
				endTime: "2025-03-10T15:00:00Z",
			})) as { uid: string; updated: boolean };

			expect(result.updated).toBe(true);
			expect(result.uid).toBe("upd-evt-1");
			expect(mockClient.davClient.updateCalendarObject).toHaveBeenCalled();
		});

		it("throws when event UID is not found", async () => {
			const db = getDb();
			const mockClient = createMockClient([]);
			const tools = createCalendarTools(mockClient, db);
			const tool = tools.find((t) => t.name === "update_event");

			await expect(
				tool?.execute({ uid: "nonexistent-uid", title: "New Title" }),
			).rejects.toThrow('Event with UID "nonexistent-uid" not found');
		});

		it("applies partial update (title only)", async () => {
			const db = getDb();
			const mockClient = createMockClient([
				{
					data: makeICalEvent({
						uid: "partial-evt-1",
						summary: "Old Title",
						dtstart: "20250311T090000Z",
						dtend: "20250311T100000Z",
					}),
					url: "/cal/partial-evt-1.ics",
					etag: '"etag-partial"',
				},
			]);
			const tools = createCalendarTools(mockClient, db);
			const tool = tools.find((t) => t.name === "update_event");

			const result = (await tool?.execute({
				uid: "partial-evt-1",
				title: "New Title Only",
			})) as { uid: string; updated: boolean };

			expect(result.updated).toBe(true);
			expect(mockClient.davClient.updateCalendarObject).toHaveBeenCalled();

			// Verify the iCal data contains the new title and original times
			const callArgs = (
				mockClient.davClient.updateCalendarObject as ReturnType<typeof vi.fn>
			).mock.calls[0]?.[0];
			const icalData = callArgs?.calendarObject?.data as string;
			expect(icalData).toContain("SUMMARY:New Title Only");
			expect(icalData).toContain("DTSTART:20250311T090000Z");
			expect(icalData).toContain("DTEND:20250311T100000Z");
		});
	});

	describe("delete_event", () => {
		it("deletes event and removes UID from D1", async () => {
			const db = getDb();
			// Pre-insert AI-created UID
			await db.insert(calendarUids).values({
				id: "id-del",
				eventUid: "del-evt-1",
				createdAt: new Date().toISOString(),
			});

			const mockClient = createMockClient([
				{
					data: makeICalEvent({
						uid: "del-evt-1",
						summary: "To Delete",
						dtstart: "20250312T100000Z",
						dtend: "20250312T110000Z",
					}),
					url: "/cal/del-evt-1.ics",
					etag: '"etag5"',
				},
			]);
			const tools = createCalendarTools(mockClient, db);
			const tool = tools.find((t) => t.name === "delete_event");

			const result = (await tool?.execute({ uid: "del-evt-1" })) as {
				uid: string;
				deleted: boolean;
			};

			expect(result.deleted).toBe(true);

			// Verify UID was removed from D1
			const rows = await db
				.select()
				.from(calendarUids)
				.where(eq(calendarUids.eventUid, "del-evt-1"));
			expect(rows).toHaveLength(0);

			// Verify CalDAV was called
			expect(mockClient.davClient.deleteCalendarObject).toHaveBeenCalled();
		});
	});
});
