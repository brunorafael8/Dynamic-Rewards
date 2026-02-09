"use client";

import Link from "next/link";
import { useEmployee } from "@/lib/queries/use-employees";
import {
  formatNumber,
  getInitials,
  nameToColor,
  cn,
} from "@/lib/utils";
import { ArrowLeft, Trophy, Calendar, Check, X } from "lucide-react";

interface GrantItem {
  id: string;
  ruleName: string;
  pointsAwarded: number;
  event_id: string;
  createdAt: string;
}

function groupGrantsByDate(
  grants: GrantItem[]
): Array<{ label: string; grants: GrantItem[] }> {
  const groups = new Map<string, GrantItem[]>();

  for (const grant of grants) {
    const date = new Date(grant.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);

    let label: string;
    if (diffDays === 0) {
      label = "Today";
    } else if (diffDays === 1) {
      label = "Yesterday";
    } else {
      label = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    const existing = groups.get(label);
    if (existing) {
      existing.push(grant);
    } else {
      groups.set(label, [grant]);
    }
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    grants: items,
  }));
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface EmployeeDetailProps {
  id: string;
}

export function EmployeeDetail({ id }: EmployeeDetailProps) {
  const { data: profile, isLoading, isError } = useEmployee(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        <div className="bg-card rounded-xl border border-border p-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
            <div className="space-y-3">
              <div className="h-7 w-48 bg-muted rounded animate-pulse" />
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-muted rounded animate-pulse mb-3 last:mb-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="space-y-6">
        <Link
          href="/employees"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leaderboard
        </Link>
        <div className="text-center py-16">
          <p className="text-foreground font-medium">Profile not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This profile may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const grants = profile.grants ?? [];
  const groupedGrants = groupGrantsByDate(grants);
  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/employees"
        className="animate-in inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        style={{ animationDelay: "0ms" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leaderboard
      </Link>

      {/* Profile header card */}
      <div
        className="animate-in bg-card rounded-xl border border-border p-6 md:p-8"
        style={{ animationDelay: "50ms" }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
            style={{ backgroundColor: nameToColor(profile.name) }}
          >
            {getInitials(profile.name)}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {profile.name}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-accent" />
                <span className="text-2xl font-mono font-bold text-accent">
                  {formatNumber(profile.point_balance)}
                </span>
                <span className="text-sm text-muted-foreground">points</span>
              </div>

              <span className="w-px h-5 bg-border hidden sm:block" />

              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                  profile.onboarded
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {profile.onboarded ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                {profile.onboarded ? "Onboarded" : "Not onboarded"}
              </span>

              <span className="w-px h-5 bg-border hidden sm:block" />

              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                Member since {memberSince}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grants timeline */}
      <div
        className="animate-in"
        style={{ animationDelay: "150ms" }}
      >
        <h2 className="font-heading font-semibold text-foreground text-lg mb-4">
          Reward History
        </h2>

        {grants.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-foreground font-medium">
              No rewards yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Grants will appear here after visits are processed.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedGrants.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  {group.label}
                </p>

                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {group.grants.map((grant, i) => (
                    <div
                      key={grant.id}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3.5",
                        i < group.grants.length - 1 &&
                          "border-b border-border"
                      )}
                    >
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-gradient-start to-gradient-end" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {grant.ruleName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatTime(grant.createdAt)}
                        </p>
                      </div>

                      {/* Points badge */}
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-accent/10 text-accent shrink-0">
                        +{formatNumber(grant.pointsAwarded)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
