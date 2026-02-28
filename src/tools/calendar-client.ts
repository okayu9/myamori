import { type DAVCalendar, DAVClient } from "tsdav";

export interface CalDAVEnv {
	CALDAV_URL: string;
	CALDAV_USERNAME: string;
	CALDAV_PASSWORD: string;
	CALDAV_CALENDAR_NAME?: string;
}

export interface CalendarClient {
	davClient: DAVClient;
	calendar: DAVCalendar;
}

export async function createCalendarClient(
	env: CalDAVEnv,
): Promise<CalendarClient> {
	const client = new DAVClient({
		serverUrl: env.CALDAV_URL,
		credentials: {
			username: env.CALDAV_USERNAME,
			password: env.CALDAV_PASSWORD,
		},
		authMethod: "Basic",
		defaultAccountType: "caldav",
	});

	await client.login();

	const calendars = await client.fetchCalendars();
	const calendarName = env.CALDAV_CALENDAR_NAME ?? "AI Assistant Shared";
	const calendar = calendars.find((c) => c.displayName === calendarName);
	if (!calendar) {
		throw new Error(
			`Calendar "${calendarName}" not found. Available: ${calendars.map((c) => c.displayName).join(", ")}`,
		);
	}

	return { davClient: client, calendar };
}
