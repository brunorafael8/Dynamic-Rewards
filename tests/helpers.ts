import type { Condition } from "../src/modules/rules/engine/types";

export function buildVisit(overrides?: Record<string, unknown>) {
	return {
		id: "v1",
		profileId: "p1",
		clockInTime: new Date("2024-01-15T08:00:00Z"),
		clockOutTime: new Date("2024-01-15T17:00:00Z"),
		scheduledStartTime: new Date("2024-01-15T09:00:00Z"),
		scheduledEndTime: new Date("2024-01-15T17:00:00Z"),
		correctClockInMethod: true,
		documentation: "Patient visit completed",
		...overrides,
	};
}

export function buildCondition(
	field: string,
	op: string,
	value?: unknown,
): Condition {
	return { field, op, value };
}
