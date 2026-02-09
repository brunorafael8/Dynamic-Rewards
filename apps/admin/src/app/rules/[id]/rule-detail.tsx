"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  Hash,
  Sparkles,
  Clock,
  FileText,
  ToggleRight,
} from "lucide-react";
import { useRule } from "@/lib/queries/use-rules";
import { cn, formatRelativeDate } from "@/lib/utils";
import { RuleForm } from "@/components/rules/rule-form";
import {
  FIELD_OPTIONS,
  AI_OPERATORS,
  OPERATORS_BY_TYPE,
  getFieldType,
} from "@/components/rules/condition-row";
import type { Condition } from "@dynamic-rewards/shared/types";

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
      </div>

      {showForm && (
        <RuleForm rule={rule} onClose={() => setShowForm(false)} />
      )}
    </>
  );
}
