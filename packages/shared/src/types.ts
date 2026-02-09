// Shared types across all apps - aligned with PDF specification

export interface Employee {
  id: string;
  name: string;
  point_balance: number;
  onboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  employee_id: string;
  type: string; // "clock_in", "clock_out", "note_added", etc.
  timestamp: string;
  metadata?: Record<string, unknown>; // Flexible JSON data
  createdAt: string;
  updatedAt: string;
}

export interface Condition {
  field: string; // Can reference metadata fields like "metadata.correct_method"
  op: string;
  value?: unknown;
}

export interface RewardRule {
  id: string;
  name: string;
  description?: string;
  event_type: string; // Which event.type this rule listens to
  conditions: Condition[];
  points: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RewardGrant {
  id: string;
  rule_id: string;
  employee_id: string;
  event_id: string;
  points_awarded: number;
  createdAt: string;
}

export interface RuleBreakdown {
  ruleId: string;
  ruleName: string;
  matchCount: number;
  pointsAwarded: number;
}

export interface ProcessResult {
  totalEvents: number;
  totalRulesEvaluated: number;
  grantsCreated: number;
  totalPointsAwarded: number;
  skippedExisting: number;
  errors: string[];
  durationMs: number;
  ruleBreakdown: RuleBreakdown[];
}

// Legacy types for backward compatibility (to be removed after migration)
/** @deprecated Use Employee instead */
export type Profile = Employee;

/** @deprecated Use Event instead */
export interface Visit {
  id: string;
  profileId: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  correctClockInMethod: boolean;
  documentation: string | null;
  createdAt: string;
  updatedAt: string;
}
