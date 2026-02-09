"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import type { Condition } from "@dynamic-rewards/shared/types";
import { ConditionRow } from "./condition-row";

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export function ConditionBuilder({
  conditions,
  onChange,
}: ConditionBuilderProps) {
  const handleAdd = useCallback(() => {
    onChange([
      ...conditions,
      { field: "clockInTime", op: "not_null" },
    ]);
  }, [conditions, onChange]);

  const handleChange = useCallback(
    (index: number, updated: Condition) => {
      const next = [...conditions];
      next[index] = updated;
      onChange(next);
    },
    [conditions, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(conditions.filter((_, i) => i !== index));
    },
    [conditions, onChange]
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Conditions</label>

      {conditions.length === 0 && (
        <p className="text-sm text-muted-foreground py-3">
          No conditions yet. Add at least one condition for this rule.
        </p>
      )}

      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <ConditionRow
            key={index}
            condition={condition}
            onChange={(updated) => handleChange(index, updated)}
            onRemove={() => handleRemove(index)}
            index={index}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="w-4 h-4" />
        Add condition
      </button>
    </div>
  );
}
