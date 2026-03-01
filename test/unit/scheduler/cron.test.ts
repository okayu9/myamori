import { describe, expect, it } from "vitest";
import { getNextRun, parseCron } from "../../../src/scheduler/cron";

describe("parseCron", () => {
	it("parses wildcard expression", () => {
		const fields = parseCron("* * * * *");
		expect(fields.minutes.size).toBe(60);
		expect(fields.hours.size).toBe(24);
		expect(fields.daysOfMonth.size).toBe(31);
		expect(fields.months.size).toBe(12);
		expect(fields.daysOfWeek.size).toBe(7);
	});

	it("parses specific values", () => {
		const fields = parseCron("30 9 15 6 3");
		expect([...fields.minutes]).toEqual([30]);
		expect([...fields.hours]).toEqual([9]);
		expect([...fields.daysOfMonth]).toEqual([15]);
		expect([...fields.months]).toEqual([6]);
		expect([...fields.daysOfWeek]).toEqual([3]);
	});

	it("parses comma-separated values", () => {
		const fields = parseCron("0,30 8,20 * * *");
		expect([...fields.minutes].sort((a, b) => a - b)).toEqual([0, 30]);
		expect([...fields.hours].sort((a, b) => a - b)).toEqual([8, 20]);
	});

	it("parses ranges", () => {
		const fields = parseCron("* * * * 1-5");
		expect([...fields.daysOfWeek].sort((a, b) => a - b)).toEqual([
			1, 2, 3, 4, 5,
		]);
	});

	it("parses step values", () => {
		const fields = parseCron("*/15 * * * *");
		expect([...fields.minutes].sort((a, b) => a - b)).toEqual([0, 15, 30, 45]);
	});

	it("parses range with step", () => {
		const fields = parseCron("0 9-17/2 * * *");
		expect([...fields.hours].sort((a, b) => a - b)).toEqual([
			9, 11, 13, 15, 17,
		]);
	});

	it("rejects invalid field count", () => {
		expect(() => parseCron("* * *")).toThrow("expected 5 fields");
		expect(() => parseCron("* * * * * *")).toThrow("expected 5 fields");
	});

	it("rejects NaN step values", () => {
		expect(() => parseCron("*/abc * * * *")).toThrow("Invalid step value");
		expect(() => parseCron("* */xyz * * *")).toThrow("Invalid step value");
	});

	it("rejects out-of-range values", () => {
		expect(() => parseCron("60 * * * *")).toThrow("out of bounds");
		expect(() => parseCron("* 24 * * *")).toThrow("out of bounds");
		expect(() => parseCron("* * 0 * *")).toThrow("out of bounds");
		expect(() => parseCron("* * * 13 *")).toThrow("out of bounds");
		expect(() => parseCron("* * * * 7")).toThrow("out of bounds");
	});
});

describe("getNextRun", () => {
	it("returns next run for */5 * * * *", () => {
		const after = new Date("2025-06-15T10:03:00Z");
		const next = getNextRun("*/5 * * * *", after);
		expect(next.toISOString()).toBe("2025-06-15T10:05:00.000Z");
	});

	it("returns next run for 0 9 * * 1-5 (weekday 9am)", () => {
		// Sunday
		const after = new Date("2025-06-15T10:00:00Z");
		const next = getNextRun("0 9 * * 1-5", after);
		// Next Monday
		expect(next.toISOString()).toBe("2025-06-16T09:00:00.000Z");
	});

	it("returns next run for 30 8,20 * * *", () => {
		const after = new Date("2025-06-15T09:00:00Z");
		const next = getNextRun("30 8,20 * * *", after);
		expect(next.toISOString()).toBe("2025-06-15T20:30:00.000Z");
	});

	it("returns next run for 0 0 1 * * (first of month midnight)", () => {
		const after = new Date("2025-06-15T12:00:00Z");
		const next = getNextRun("0 0 1 * *", after);
		expect(next.toISOString()).toBe("2025-07-01T00:00:00.000Z");
	});

	it("skips to next minute if after is exact match", () => {
		const after = new Date("2025-06-15T10:00:00Z");
		const next = getNextRun("0 10 * * *", after);
		// Should not return 10:00 since we start from the next minute
		expect(next.getTime()).toBeGreaterThan(after.getTime());
	});

	it("handles month boundary", () => {
		const after = new Date("2025-01-31T23:59:00Z");
		const next = getNextRun("0 0 * * *", after);
		expect(next.toISOString()).toBe("2025-02-01T00:00:00.000Z");
	});

	it("handles year boundary", () => {
		const after = new Date("2025-12-31T23:59:00Z");
		const next = getNextRun("0 0 1 1 *", after);
		expect(next.toISOString()).toBe("2026-01-01T00:00:00.000Z");
	});

	it("uses POSIX OR semantics when both DOM and DOW are restricted", () => {
		// "0 0 15 * 1" = 15th of month OR any Monday
		// 2025-06-14 is Saturday. Next Monday is 2025-06-16, next 15th is 2025-06-15.
		// With OR semantics, 15th (Sunday) should match first.
		const after = new Date("2025-06-14T00:00:00Z");
		const next = getNextRun("0 0 15 * 1", after);
		expect(next.toISOString()).toBe("2025-06-15T00:00:00.000Z");
	});

	it("uses AND semantics when only DOM is restricted", () => {
		// "0 0 15 * *" = 15th of every month (DOW is *, so AND)
		const after = new Date("2025-06-14T00:00:00Z");
		const next = getNextRun("0 0 15 * *", after);
		expect(next.toISOString()).toBe("2025-06-15T00:00:00.000Z");
	});
});
