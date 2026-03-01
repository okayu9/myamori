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

const CALDAV_TIMEOUT_MS = 30_000;

function createTimeoutFetch(timeoutMs: number): typeof fetch {
	return async (input, init) => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			return await fetch(input, { ...init, signal: controller.signal });
		} finally {
			clearTimeout(timer);
		}
	};
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
		fetch: createTimeoutFetch(CALDAV_TIMEOUT_MS),
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
