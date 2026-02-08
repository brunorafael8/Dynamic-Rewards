// Shared types across all apps

export interface Profile {
  id: string;
  name: string;
  pointBalance: number;
  onboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Condition {
  field: string;
  op: string;
  value?: unknown;
}

export interface RewardRule {
  id: string;
  name: string;
  description?: string;
  eventType: string;
  conditions: Condition[];
  points: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessResult {
  totalVisits: number;
  totalRulesEvaluated: number;
  grantsCreated: number;
  totalPointsAwarded: number;
  skippedExisting: number;
  errors: string[];
  durationMs: number;
}

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
