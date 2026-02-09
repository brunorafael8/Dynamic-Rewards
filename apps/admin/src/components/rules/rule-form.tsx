"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import type { Condition, RewardRule } from "@dynamic-rewards/shared/types";
import type { ConditionInput } from "@dynamic-rewards/shared/schemas";
import {
  useCreateRule,
  useUpdateRule,
} from "@/lib/queries/use-rules";
import { ConditionBuilder } from "./condition-builder";

interface RuleFormProps {
  rule?: RewardRule;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
  points?: string;
  conditions?: string;
}

export function RuleForm({ rule, onClose }: RuleFormProps) {
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [points, setPoints] = useState(rule?.points ?? 10);
  const [conditions, setConditions] = useState<Condition[]>(
    rule?.conditions ?? []
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const createRule = useCreateRule();
  const updateRule = useUpdateRule();

  const isEditing = !!rule;
  const isPending = createRule.isPending || updateRule.isPending;

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const validate = useCallback((): boolean => {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (points < 1) next.points = "Points must be at least 1";
    if (conditions.length === 0)
      next.conditions = "At least one condition is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [name, points, conditions]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        event_type: "visit",
        points,
        conditions: conditions as ConditionInput[],
      };

      try {
        if (isEditing) {
          await updateRule.mutateAsync({ id: rule.id, ...payload });
        } else {
          await createRule.mutateAsync(payload);
        }
        onClose();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        alert(`Failed to ${isEditing ? "update" : "create"} rule: ${message}`);
      }
    },
    [
      validate,
      name,
      description,
      points,
      conditions,
      isEditing,
      rule,
      createRule,
      updateRule,
      onClose,
    ]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]">
      <div
        className="animate-in w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit rule" : "New rule"}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-heading font-semibold text-foreground">
            {isEditing ? "Edit Rule" : "New Rule"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="space-y-1.5">
            <label
              htmlFor="rule-name"
              className="text-sm font-medium text-foreground"
            >
              Name
            </label>
            <input
              id="rule-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder="e.g. On-time Clock In Bonus"
              className={`h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.name ? "border-destructive" : "border-border"
              }`}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="rule-description"
              className="text-sm font-medium text-foreground"
            >
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <textarea
              id="rule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this rule rewards..."
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="rule-points"
              className="text-sm font-medium text-foreground"
            >
              Points
            </label>
            <input
              id="rule-points"
              type="number"
              min={1}
              value={points}
              onChange={(e) => {
                setPoints(Number(e.target.value));
                if (errors.points)
                  setErrors((p) => ({ ...p, points: undefined }));
              }}
              className={`h-10 w-32 rounded-lg border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.points ? "border-destructive" : "border-border"
              }`}
            />
            {errors.points && (
              <p className="text-xs text-destructive">{errors.points}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <ConditionBuilder
              conditions={conditions}
              onChange={(next) => {
                setConditions(next);
                if (errors.conditions)
                  setErrors((p) => ({ ...p, conditions: undefined }));
              }}
            />
            {errors.conditions && (
              <p className="text-xs text-destructive">{errors.conditions}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex h-10 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? "Save Changes" : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
