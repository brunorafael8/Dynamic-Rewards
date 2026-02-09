import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

// Employee schema - holds current point balance
export const employees = pgTable("employees", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	point_balance: integer("point_balance").notNull().default(0),
	onboarded: boolean("onboarded").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Event schema - flexible structure with type + metadata
export const events = pgTable(
	"events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		employee_id: uuid("employee_id")
			.notNull()
			.references(() => employees.id),
		type: text("type").notNull(), // "clock_in", "clock_out", "note_added", etc.
		timestamp: timestamp("timestamp").defaultNow().notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Flexible JSON data
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("events_employee_id_idx").on(table.employee_id)],
);

// Reward rule schema
export const rewardRules = pgTable(
	"reward_rules",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		description: text("description"),
		event_type: text("event_type").notNull(), // Which event.type this rule listens to
		conditions: jsonb("conditions").notNull().$type<
			Array<{
				field: string; // Can reference metadata fields like "metadata.correct_method"
				op: string;
				value?: unknown;
			}>
		>(),
		points: integer("points").notNull(),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("reward_rules_active_idx").on(table.active)],
);

// Reward grant schema - idempotency via unique constraint
export const rewardGrants = pgTable(
	"reward_grants",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		rule_id: uuid("rule_id")
			.notNull()
			.references(() => rewardRules.id),
		employee_id: uuid("employee_id")
			.notNull()
			.references(() => employees.id),
		event_id: uuid("event_id")
			.notNull()
			.references(() => events.id),
		points_awarded: integer("points_awarded").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("reward_grants_rule_event_unique").on(table.rule_id, table.event_id),
	],
);
