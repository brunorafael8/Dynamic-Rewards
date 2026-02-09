"use client";

import { useCallback, useMemo } from "react";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Condition } from "@dynamic-rewards/shared/types";

const FIELD_OPTIONS = [
  { value: "clockInTime", label: "Clock In Time", type: "datetime" },
  { value: "clockOutTime", label: "Clock Out Time", type: "datetime" },
  {
    value: "scheduledStartTime",
    label: "Scheduled Start Time",
    type: "datetime",
  },
  { value: "scheduledEndTime", label: "Scheduled End Time", type: "datetime" },
  {
    value: "correctClockInMethod",
    label: "Correct Clock-In Method",
    type: "boolean",
  },
  { value: "documentation", label: "Documentation", type: "text" },
] as const;

type FieldType = "datetime" | "boolean" | "text";

const OPERATORS_BY_TYPE: Record<
  FieldType,
  { value: string; label: string }[]
> = {
  datetime: [
    { value: "not_null", label: "is present" },
    { value: "is_null", label: "is empty" },
    { value: "lte_field", label: "<= field" },
    { value: "gte_field", label: ">= field" },
  ],
  boolean: [
    { value: "eq", label: "equals" },
    { value: "neq", label: "not equals" },
  ],
  text: [
    { value: "not_null", label: "is present" },
    { value: "is_null", label: "is empty" },
    { value: "contains", label: "contains" },
    { value: "eq", label: "equals" },
    { value: "llm", label: "LLM eval" },
    { value: "sentiment", label: "sentiment" },
    { value: "quality_score", label: "quality score" },
  ],
};

const AI_OPERATORS = new Set(["llm", "sentiment", "quality_score"]);

const DATETIME_FIELDS = FIELD_OPTIONS.filter((f) => f.type === "datetime");

const SENTIMENT_OPTIONS = [
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
  { value: "neutral", label: "Neutral" },
];

function getFieldType(field: string): FieldType {
  const found = FIELD_OPTIONS.find((f) => f.value === field);
  return found?.type ?? "text";
}

interface ConditionRowProps {
  condition: Condition;
  onChange: (updated: Condition) => void;
  onRemove: () => void;
  index: number;
}

export function ConditionRow({
  condition,
  onChange,
  onRemove,
  index,
}: ConditionRowProps) {
  const fieldType = useMemo(
    () => getFieldType(condition.field),
    [condition.field]
  );
  const operators = useMemo(
    () => OPERATORS_BY_TYPE[fieldType] ?? [],
    [fieldType]
  );
  const isAI = AI_OPERATORS.has(condition.op);

  const handleFieldChange = useCallback(
    (field: string) => {
      const newType = getFieldType(field);
      const firstOp = OPERATORS_BY_TYPE[newType]?.[0]?.value ?? "eq";
      onChange({ field, op: firstOp, value: undefined });
    },
    [onChange]
  );

  const handleOperatorChange = useCallback(
    (op: string) => {
      const needsNoValue = op === "not_null" || op === "is_null";
      onChange({
        ...condition,
        op,
        value: needsNoValue ? undefined : condition.value,
      });
    },
    [onChange, condition]
  );

  const handleValueChange = useCallback(
    (value: unknown) => {
      onChange({ ...condition, value });
    },
    [onChange, condition]
  );

  const renderValueInput = () => {
    if (condition.op === "not_null" || condition.op === "is_null") {
      return null;
    }

    if (condition.op === "eq" && fieldType === "boolean") {
      return (
        <select
          value={condition.value === true ? "true" : "false"}
          onChange={(e) => handleValueChange(e.target.value === "true")}
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[100px]"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (condition.op === "neq" && fieldType === "boolean") {
      return (
        <select
          value={condition.value === true ? "true" : "false"}
          onChange={(e) => handleValueChange(e.target.value === "true")}
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[100px]"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (condition.op === "lte_field" || condition.op === "gte_field") {
      return (
        <select
          value={typeof condition.value === "string" ? condition.value : ""}
          onChange={(e) => handleValueChange(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
        >
          <option value="">Select field...</option>
          {DATETIME_FIELDS.filter((f) => f.value !== condition.field).map(
            (f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            )
          )}
        </select>
      );
    }

    if (condition.op === "llm") {
      return (
        <textarea
          value={typeof condition.value === "string" ? condition.value : ""}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="Enter LLM prompt..."
          rows={2}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      );
    }

    if (condition.op === "sentiment") {
      return (
        <select
          value={typeof condition.value === "string" ? condition.value : ""}
          onChange={(e) => handleValueChange(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[130px]"
        >
          <option value="">Select...</option>
          {SENTIMENT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      );
    }

    if (condition.op === "quality_score") {
      return (
        <input
          type="number"
          min={0}
          max={100}
          value={
            typeof condition.value === "number" ? condition.value : ""
          }
          onChange={(e) =>
            handleValueChange(
              e.target.value === "" ? undefined : Number(e.target.value)
            )
          }
          placeholder="0-100"
          className="h-9 w-24 px-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      );
    }

    return (
      <input
        type="text"
        value={typeof condition.value === "string" ? condition.value : ""}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder="Value..."
        className="h-9 flex-1 min-w-[120px] px-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    );
  };

  return (
    <div
      className={cn(
        "group relative flex flex-wrap items-start gap-2 rounded-xl border border-border bg-card p-3 pl-4 transition-colors",
        isAI && "gradient-border"
      )}
    >
      {!isAI && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-primary" />
      )}

      <span className="flex h-9 items-center text-xs font-medium uppercase tracking-wider text-muted-foreground min-w-[48px]">
        {index === 0 ? "Where" : "And"}
      </span>

      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
      >
        <option value="">Select field...</option>
        {FIELD_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={condition.op}
        onChange={(e) => handleOperatorChange(e.target.value)}
        className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[120px]"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {renderValueInput()}

      {isAI && (
        <span className="inline-flex h-9 items-center gap-1 rounded-lg bg-accent/10 px-2 text-xs font-medium text-accent">
          <Sparkles className="w-3 h-3" />
          AI
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        aria-label="Remove condition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export { FIELD_OPTIONS, AI_OPERATORS, getFieldType, OPERATORS_BY_TYPE };
