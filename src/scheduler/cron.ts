/**
 * Minimal 5-field cron expression parser.
 * Format: minute hour day-of-month month day-of-week
 * Supports: numbers, *, commas (,), ranges (-), steps (/)
 */

interface CronFields {
	minutes: Set<number>;
	hours: Set<number>;
	daysOfMonth: Set<number>;
	months: Set<number>;
	daysOfWeek: Set<number>;
}

function parseField(field: string, min: number, max: number): Set<number> {
	const values = new Set<number>();

	for (const part of field.split(",")) {
		const slashIdx = part.indexOf("/");
		const step =
			slashIdx >= 0 ? Number.parseInt(part.substring(slashIdx + 1), 10) : 1;
		const range = slashIdx >= 0 ? part.substring(0, slashIdx) : part;

		if (step < 1) {
			throw new Error(`Invalid step value: ${step}`);
		}

		let start: number;
		let end: number;

		if (range === "*") {
			start = min;
			end = max;
		} else if (range.includes("-")) {
			const dashIdx = range.indexOf("-");
			start = Number.parseInt(range.substring(0, dashIdx), 10);
			end = Number.parseInt(range.substring(dashIdx + 1), 10);
			if (Number.isNaN(start) || Number.isNaN(end)) {
				throw new Error(`Invalid range: ${range}`);
			}
			if (start < min || end > max || start > end) {
				throw new Error(`Range ${range} out of bounds [${min}-${max}]`);
			}
		} else {
			const val = Number.parseInt(range, 10);
			if (Number.isNaN(val) || val < min || val > max) {
				throw new Error(`Value ${range} out of bounds [${min}-${max}]`);
			}
			start = val;
			end = val;
		}

		for (let i = start; i <= end; i += step) {
			values.add(i);
		}
	}

	return values;
}

export function parseCron(expr: string): CronFields {
	const parts = expr.trim().split(/\s+/);
	if (parts.length !== 5) {
		throw new Error(
			`Invalid cron expression: expected 5 fields, got ${parts.length}`,
		);
	}

	const [minute, hour, dom, month, dow] = parts as [
		string,
		string,
		string,
		string,
		string,
	];

	return {
		minutes: parseField(minute, 0, 59),
		hours: parseField(hour, 0, 23),
		daysOfMonth: parseField(dom, 1, 31),
		months: parseField(month, 1, 12),
		daysOfWeek: parseField(dow, 0, 6),
	};
}

/**
 * Compute the next run time after `after` for the given cron expression.
 * Returns a Date in UTC.
 */
export function getNextRun(cronExpr: string, after: Date): Date {
	const fields = parseCron(cronExpr);
	const d = new Date(after.getTime());

	// Start from the next minute
	d.setUTCSeconds(0, 0);
	d.setUTCMinutes(d.getUTCMinutes() + 1);

	// Safety limit to avoid infinite loops on invalid expressions
	const maxIterations = 366 * 24 * 60; // ~1 year of minutes
	let iterations = 0;

	while (iterations < maxIterations) {
		iterations++;

		if (!fields.months.has(d.getUTCMonth() + 1)) {
			// Advance to next month
			d.setUTCMonth(d.getUTCMonth() + 1, 1);
			d.setUTCHours(0, 0, 0, 0);
			continue;
		}

		if (!fields.daysOfMonth.has(d.getUTCDate())) {
			d.setUTCDate(d.getUTCDate() + 1);
			d.setUTCHours(0, 0, 0, 0);
			continue;
		}

		if (!fields.daysOfWeek.has(d.getUTCDay())) {
			d.setUTCDate(d.getUTCDate() + 1);
			d.setUTCHours(0, 0, 0, 0);
			continue;
		}

		if (!fields.hours.has(d.getUTCHours())) {
			d.setUTCHours(d.getUTCHours() + 1, 0, 0, 0);
			continue;
		}

		if (!fields.minutes.has(d.getUTCMinutes())) {
			d.setUTCMinutes(d.getUTCMinutes() + 1, 0, 0);
			continue;
		}

		return d;
	}

	throw new Error(`Could not find next run for cron expression: ${cronExpr}`);
}
