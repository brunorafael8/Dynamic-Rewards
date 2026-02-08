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

export const profiles = pgTable("profiles", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	pointBalance: integer("point_balance").notNull().default(0),
	onboarded: boolean("onboarded").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const visits = pgTable(
	"visits",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		profileId: uuid("profile_id")
			.notNull()
			.references(() => profiles.id),
		clockInTime: timestamp("clock_in_time"),
		clockOutTime: timestamp("clock_out_time"),
		scheduledStartTime: timestamp("scheduled_start_time"),
		scheduledEndTime: timestamp("scheduled_end_time"),
		correctClockInMethod: boolean("correct_clock_in_method").default(false),
		documentation: text("documentation"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("visits_profile_id_idx").on(table.profileId)],
);

export const rewardRules = pgTable(
	"reward_rules",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		description: text("description"),
		eventType: text("event_type").notNull().default("visit"),
		conditions: jsonb("conditions").notNull().$type<
			Array<{
				field: string;
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

export const rewardGrants = pgTable(
	"reward_grants",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ruleId: uuid("rule_id")
			.notNull()
			.references(() => rewardRules.id),
		profileId: uuid("profile_id")
			.notNull()
			.references(() => profiles.id),
		visitId: uuid("visit_id")
			.notNull()
			.references(() => visits.id),
		pointsAwarded: integer("points_awarded").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("reward_grants_rule_visit_unique").on(table.ruleId, table.visitId),
	],
);
