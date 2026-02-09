"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  Hash,
  Sparkles,
  Clock,
  FileText,
  ToggleRight,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  FlaskConical,
} from "lucide-react";
import { useRule } from "@/lib/queries/use-rules";
import { cn, formatRelativeDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { RuleForm } from "@/components/rules/rule-form";
import {
  FIELD_OPTIONS,
  AI_OPERATORS,
  OPERATORS_BY_TYPE,
  getFieldType,
} from "@/components/rules/condition-row";
import type { Condition } from "@dynamic-rewards/shared/types";

interface SimulationConditionResult {
  field: string;
  op: string;
  value: unknown;
  actual: unknown;
  passed: boolean;
  reasoning?: string;
}

interface SimulationResult {
  matches: boolean;
  conditionResults: SimulationConditionResult[];
  durationMs: number;
}

const FIELD_ICONS: Record<string, typeof Clock> = {
  clockInTime: Clock,
  clockOutTime: Clock,
  scheduledStartTime: Calendar,
  scheduledEndTime: Calendar,
  correctClockInMethod: ToggleRight,
  documentation: FileText,
};

function getFieldLabel(field: string): string {
  return FIELD_OPTIONS.find((f) => f.value === field)?.label ?? field;
}

function getOperatorLabel(field: string, op: string): string {
  const fieldType = getFieldType(field);
  const operators = OPERATORS_BY_TYPE[fieldType] ?? [];
  return operators.find((o) => o.value === op)?.label ?? op;
}

function formatValue(condition: Condition): string | null {
  if (condition.op === "not_null" || condition.op === "is_null") {
    return null;
  }
  if (condition.value === undefined || condition.value === null) return null;
  if (typeof condition.value === "boolean") {
    return condition.value ? "true" : "false";
  }
  if (condition.op === "lte_field" || condition.op === "gte_field") {
    return getFieldLabel(String(condition.value));
  }
  return String(condition.value);
}

function ConditionCard({
  condition,
  index,
}: {
  condition: Condition;
  index: number;
}) {
  const isAI = AI_OPERATORS.has(condition.op);
  const FieldIcon = FIELD_ICONS[condition.field] ?? Hash;
  const value = formatValue(condition);

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-4 pl-5",
        isAI && "gradient-border"
      )}
    >
      {!isAI && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-primary" />
      )}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            isAI ? "bg-accent/10" : "bg-primary/10"
          )}
        >
          {isAI ? (
            <Sparkles className="w-4 h-4 text-accent" />
          ) : (
            <FieldIcon className="w-4 h-4 text-primary" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {index === 0 ? "Where" : "And"}
            </span>
            <span className="font-medium text-foreground">
              {getFieldLabel(condition.field)}
            </span>
            <span className="text-muted-foreground">
              {getOperatorLabel(condition.field, condition.op)}
            </span>
            {value !== null && (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-foreground">
                {value}
              </span>
            )}
          </div>

          {isAI && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
              <Sparkles className="w-3 h-3" />
              AI-powered
            </span>
          )}

          {condition.op === "llm" && typeof condition.value === "string" && (
            <p className="mt-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground italic">
              &quot;{condition.value}&quot;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RuleSimulator({ ruleId, conditions }: { ruleId: string; conditions: Condition[] }) {
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const c of conditions) {
      if (!initial[c.field]) {
        initial[c.field] = "";
      }
    }
    return initial;
  });

  const simulate = useMutation({
    mutationFn: async (metadata: Record<string, unknown>): Promise<SimulationResult> => {
      const { data } = await api.post(`/rules/${ruleId}/test`, { metadata });
      return data;
    },
  });

  const handleRun = () => {
    const metadata: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(fields)) {
      if (val === "") continue;
      if (val === "true") metadata[key] = true;
      else if (val === "false") metadata[key] = false;
      else if (!Number.isNaN(Number(val)) && val.trim() !== "") metadata[key] = Number(val);
      else metadata[key] = val;
    }
    simulate.mutate(metadata);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-heading font-semibold text-foreground">
          Test Rule
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Simulate this rule against test data without creating grants.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.keys(fields).map((field) => (
          <div key={field}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {getFieldLabel(field)}
            </label>
            <input
              type="text"
              value={fields[field]}
              onChange={(e) =>
                setFields((prev) => ({ ...prev, [field]: e.target.value }))
              }
              placeholder={`Enter ${field}...`}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleRun}
        disabled={simulate.isPending}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
          "bg-accent text-accent-foreground",
          simulate.isPending
            ? "opacity-60 cursor-not-allowed"
            : "hover:brightness-110 hover:shadow-md active:scale-[0.98]"
        )}
      >
        {simulate.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Run Test
          </>
        )}
      </button>

      {simulate.isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">
            {(simulate.error as Error).message}
          </p>
        </div>
      )}

      {simulate.data && (
        <div className="animate-in space-y-3">
          <div className="flex items-center gap-3">
            {simulate.data.matches ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                <CheckCircle2 className="w-4 h-4" />
                MATCH
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
                <XCircle className="w-4 h-4" />
                NO MATCH
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {simulate.data.durationMs}ms
            </span>
          </div>

          <div className="space-y-2">
            {simulate.data.conditionResults.map((cr, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  cr.passed
                    ? "border-success/30 bg-success/5"
                    : "border-destructive/30 bg-destructive/5"
                )}
              >
                {cr.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-medium">{getFieldLabel(cr.field)}</span>
                    <span className="text-muted-foreground">
                      {getOperatorLabel(cr.field, cr.op)}
                    </span>
                    {cr.value !== undefined && cr.value !== null && (
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {String(cr.value)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Actual: <span className="font-mono">{cr.actual === null ? "null" : String(cr.actual)}</span>
                  </p>
                  {cr.reasoning && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {cr.reasoning}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface RuleDetailProps {
  id: string;
}

export function RuleDetail({ id }: RuleDetailProps) {
  const { data: rule, isLoading, error } = useRule(id);
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-20 bg-muted rounded animate-pulse" />
        <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-card rounded-xl border border-border animate-pulse"
            />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-card rounded-xl border border-border animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-heading font-semibold text-foreground mb-2">
          Rule not found
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          The rule you&apos;re looking for doesn&apos;t exist or was removed.
        </p>
        <Link
          href="/rules"
          className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Rules
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-in">
        <Link
          href="/rules"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Rules
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {rule.name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  rule.active
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    rule.active
                      ? "bg-success pulse-dot"
                      : "bg-muted-foreground/40"
                  )}
                />
                {rule.active ? "Active" : "Inactive"}
              </span>
            </div>
            {rule.description && (
              <p className="text-sm text-muted-foreground max-w-xl">
                {rule.description}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Points Awarded
            </p>
            <p className="text-2xl font-heading font-bold text-accent">
              +{rule.points}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Event Type
            </p>
            <p className="text-2xl font-heading font-bold text-foreground capitalize">
              {rule.event_type}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Created
            </p>
            <p className="text-lg font-heading font-semibold text-foreground">
              {formatRelativeDate(rule.createdAt)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Updated {formatRelativeDate(rule.updatedAt)}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4">
            Conditions ({rule.conditions.length})
          </h2>
          {rule.conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No conditions configured for this rule.
            </p>
          ) : (
            <div className="space-y-3">
              {rule.conditions.map((condition, index) => (
                <ConditionCard
                  key={index}
                  condition={condition}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Technical Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Rule ID: </span>
              <span className="font-mono text-xs text-foreground">
                {rule.id}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Event Type: </span>
              <span className="text-foreground">{rule.event_type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span className="text-foreground">
                {new Date(rule.createdAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated: </span>
              <span className="text-foreground">
                {new Date(rule.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {rule.conditions.length > 0 && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-6">
            <RuleSimulator ruleId={rule.id} conditions={rule.conditions} />
          </div>
        )}
      </div>

      {showForm && (
        <RuleForm rule={rule} onClose={() => setShowForm(false)} />
      )}
    </>
  );
}
