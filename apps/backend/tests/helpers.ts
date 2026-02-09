import type { Condition } from "../src/modules/rules/engine/types";

export function buildEvent(overrides?: Record<string, unknown>) {
	return {
		id: "e1",
		employee_id: "emp1",
		type: "shift",
		timestamp: new Date("2024-01-15T08:00:00Z"),
		// Metadata fields spread to top level (as eventToRecord does)
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
