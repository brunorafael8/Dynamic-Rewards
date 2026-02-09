"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import type { RewardRule } from "@dynamic-rewards/shared/types";
import { useRules, useDeleteRule } from "@/lib/queries/use-rules";
import { cn, formatRelativeDate } from "@/lib/utils";
import { RuleForm } from "./rule-form";

type FilterStatus = "all" | "active" | "inactive";

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const PAGE_SIZE = 10;

export function RulesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const statusParam = searchParams.get("status") as FilterStatus | null;
  const status: FilterStatus =
    statusParam === "active" || statusParam === "inactive"
      ? statusParam
      : "all";

  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | undefined>(
    undefined
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filters = useMemo(() => {
    if (status === "active") return { active: true };
    if (status === "inactive") return { active: false };
    return undefined;
  }, [status]);

  const { data, isLoading } = useRules(filters, PAGE_SIZE, page * PAGE_SIZE);
  const deleteRule = useDeleteRule();

  const rules = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, total);

  const setStatus = useCallback(
    (next: FilterStatus) => {
      setPage(0);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") {
        params.delete("status");
      } else {
        params.set("status", next);
      }
      router.replace(`/rules?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleEdit = useCallback(
    (rule: RewardRule) => {
      setOpenMenuId(null);
      setEditingRule(rule);
      setShowForm(true);
    },
    []
  );

  const handleDelete = useCallback(
    async (rule: RewardRule) => {
      setOpenMenuId(null);
      const confirmed = window.confirm(
        `Deactivate "${rule.name}"? This will soft-delete the rule.`
      );
      if (!confirmed) return;
      try {
        await deleteRule.mutateAsync(rule.id);
      } catch {
        alert("Failed to delete rule");
      }
    },
    [deleteRule]
  );

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingRule(undefined);
  }, []);

  const handleNewRule = useCallback(() => {
    setEditingRule(undefined);
    setShowForm(true);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 bg-muted rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="bg-card rounded-xl border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 border-b border-border last:border-b-0 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Reward Rules
            </h1>
            <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-xs font-medium text-muted-foreground">
              {total}
            </span>
          </div>
          <button
            onClick={handleNewRule}
            className="flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatus(filter.value)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                status === filter.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-heading font-semibold text-foreground mb-1">
              No rules found
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {status === "all"
                ? "Create your first reward rule to get started."
                : `No ${status} rules found.`}
            </p>
            {status === "all" && (
              <button
                onClick={handleNewRule}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Plus className="w-4 h-4" />
                New Rule
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_90px_100px_90px_110px_48px] min-w-[640px] items-center gap-4 border-b border-border bg-muted/50 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Name</span>
              <span>Points</span>
              <span>Conditions</span>
              <span>Status</span>
              <span>Created</span>
              <span />
            </div>

            {/* Table Rows */}
            {rules.map((rule, i) => (
              <div
                key={rule.id}
                className="animate-in grid grid-cols-[1fr_90px_100px_90px_110px_48px] min-w-[640px] items-center gap-4 border-b border-border px-5 py-3.5 transition-colors hover:bg-muted/30 last:border-b-0"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Name */}
                <div className="min-w-0">
                  <Link
                    href={`/rules/${rule.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {rule.name}
                  </Link>
                  {rule.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {rule.description}
                    </p>
                  )}
                </div>

                {/* Points */}
                <div>
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    +{rule.points}
                  </span>
                </div>

                {/* Conditions Count */}
                <div className="text-sm text-muted-foreground">
                  {rule.conditions.length}{" "}
                  {rule.conditions.length === 1 ? "condition" : "conditions"}
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      rule.active
                        ? "bg-success pulse-dot"
                        : "bg-muted-foreground/40"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      rule.active
                        ? "text-success"
                        : "text-muted-foreground"
                    )}
                  >
                    {rule.active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Created */}
                <div className="text-xs text-muted-foreground">
                  {formatRelativeDate(rule.createdAt)}
                </div>

                {/* Actions */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === rule.id ? null : rule.id
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {openMenuId === rule.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-card py-1 shadow-lg">
                        <Link
                          href={`/rules/${rule.id}`}
                          onClick={() => setOpenMenuId(null)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          View Details
                        </Link>
                        <button
                          onClick={() => handleEdit(rule)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                          Edit Rule
                        </button>
                        <button
                          onClick={() => handleDelete(rule)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          {rule.active ? "Deactivate" : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {showingFrom}-{showingTo} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-xs text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <RuleForm rule={editingRule} onClose={handleCloseForm} />
      )}
    </>
  );
}
