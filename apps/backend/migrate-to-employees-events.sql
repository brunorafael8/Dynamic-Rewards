-- Migration: Profile/Visit → Employee/Event
-- Safe migration: drops old tables and creates new schema

BEGIN;

-- Drop old tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS reward_grants CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS reward_rules CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create new employees table (was profiles)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  point_balance INTEGER NOT NULL DEFAULT 0,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create new events table (was visits)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  type TEXT NOT NULL, -- "shift", "clock_in", "clock_out", "note_added", etc.
  timestamp TIMESTAMP NOT NULL DEFAULT now(),
  metadata JSONB, -- Flexible JSON data
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_employee_id_idx ON events(employee_id);

-- Create reward_rules table
CREATE TABLE IF NOT EXISTS reward_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL, -- Which event.type this rule listens to
  conditions JSONB NOT NULL, -- Array of condition objects
  points INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reward_rules_active_idx ON reward_rules(active);

-- Create reward_grants table
CREATE TABLE IF NOT EXISTS reward_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES reward_rules(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  event_id UUID NOT NULL REFERENCES events(id),
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(rule_id, event_id) -- Idempotency
);

COMMIT;
