"use client";

import { useCallback, useState } from "react";
import { useProcessEvents } from "@/lib/queries/use-processing";
import { cn, formatNumber } from "@/lib/utils";
import type { ProcessResult } from "@dynamic-rewards/shared/types";
import {
  Zap,
  Loader2,
  Eye,
  BookOpen,
  Gift,
  Trophy,
  SkipForward,
  Clock,
  AlertTriangle,
  History,
} from "lucide-react";

interface HistoryEntry {
  timestamp: Date;
  result: ProcessResult;
}

function StatusIndicator({ isProcessing }: { isProcessing: boolean }) {
  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
        </span>
        <span className="text-accent font-medium">Processing</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="relative flex h-2.5 w-2.5">
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success pulse-dot" />
      </span>
      <span className="text-muted-foreground">Idle</span>
    </div>
  );
}

function StatCell({
  label,
  value,
  icon: Icon,
  colorClass,
  delay,
}: {
  label: string;
  value: string;
  icon: typeof Eye;
  colorClass?: string;
  delay: number;
}) {
  return (
    <div
      className="animate-in bg-card rounded-xl border border-border p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-xl font-mono font-bold", colorClass ?? "text-card-foreground")}>
        {value}
      </p>
    </div>
  );
}

function ResultCard({ result }: { result: ProcessResult }) {
  return (
    <div className="animate-in space-y-4" style={{ animationDelay: "50ms" }}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCell
          label="Total Visits"
          value={formatNumber(result.totalEvents)}
          icon={Eye}
          delay={100}
        />
        <StatCell
          label="Rules Evaluated"
          value={formatNumber(result.totalRulesEvaluated)}
          icon={BookOpen}
          delay={150}
        />
        <StatCell
          label="Grants Created"
          value={formatNumber(result.grantsCreated)}
          icon={Gift}
          colorClass={result.grantsCreated > 0 ? "text-success" : undefined}
          delay={200}
        />
        <StatCell
          label="Points Awarded"
          value={formatNumber(result.totalPointsAwarded)}
          icon={Trophy}
          colorClass="text-accent"
          delay={250}
        />
        <StatCell
          label="Skipped"
          value={formatNumber(result.skippedExisting)}
          icon={SkipForward}
          colorClass="text-muted-foreground"
          delay={300}
        />
        <StatCell
          label="Duration"
          value={`${(result.durationMs / 1000).toFixed(2)}s`}
          icon={Clock}
          delay={350}
        />
      </div>

      {result.errors.length > 0 && (
        <div
          className="animate-in rounded-xl border border-destructive/30 bg-destructive/5 p-4"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {result.errors.length} {result.errors.length === 1 ? "error" : "errors"} occurred
            </span>
          </div>
          <ul className="space-y-1">
            {result.errors.map((error, i) => (
              <li key={i} className="text-sm text-destructive/80 font-mono pl-6">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HistoryTable({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div
      className="animate-in bg-card rounded-xl border border-border overflow-hidden"
      style={{ animationDelay: "100ms" }}
    >
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <History className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-heading font-semibold text-foreground">
          Session History
        </h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {entries.length} {entries.length === 1 ? "run" : "runs"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">
                Time
              </th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">
                Grants
              </th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">
                Points
              </th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr
                key={i}
                className={cn(
                  "border-t border-border",
                  i % 2 === 0 ? "bg-card" : "bg-muted/20"
                )}
              >
                <td className="px-5 py-2.5 text-muted-foreground font-mono text-xs">
                  {entry.timestamp.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="px-5 py-2.5 text-right font-mono">
                  <span className={entry.result.grantsCreated > 0 ? "text-success" : "text-muted-foreground"}>
                    {formatNumber(entry.result.grantsCreated)}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right font-mono text-accent">
                  {formatNumber(entry.result.totalPointsAwarded)}
                </td>
                <td className="px-5 py-2.5 text-right font-mono text-muted-foreground text-xs">
                  {(entry.result.durationMs / 1000).toFixed(2)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProcessingContent() {
  const { mutate, data: lastResult, isPending, isSuccess } = useProcessEvents();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const handleProcess = useCallback(() => {
    const confirmed = window.confirm(
      "This will evaluate all visits against active reward rules and distribute points. Continue?"
    );
    if (!confirmed) return;

    mutate(undefined, {
      onSuccess: (result) => {
        setHistory((prev) => [{ timestamp: new Date(), result }, ...prev]);
      },
    });
  }, [mutate]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Reward Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Process visits and distribute reward points
          </p>
        </div>
        <StatusIndicator isProcessing={isPending} />
      </div>

      <div className="animate-in bg-card rounded-xl border border-border p-8 text-center">
        <div className="max-w-md mx-auto space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-7 h-7 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-heading font-semibold text-foreground">
              Process All Visits
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Evaluate all visits against active reward rules and distribute
              points. Existing grants will be skipped automatically.
            </p>
          </div>
          <button
            onClick={handleProcess}
            disabled={isPending}
            className={cn(
              "inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-base font-medium rounded-xl transition-all duration-200",
              "bg-accent text-accent-foreground",
              isPending
                ? "opacity-60 cursor-not-allowed"
                : "hover:brightness-110 hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]"
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Process All Visits
              </>
            )}
          </button>
        </div>
      </div>

      {isSuccess && lastResult ? <ResultCard result={lastResult} /> : null}

      <HistoryTable entries={history} />
    </div>
  );
}
