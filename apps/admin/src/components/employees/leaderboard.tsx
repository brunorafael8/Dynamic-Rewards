"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEmployees } from "@/lib/queries/use-employees";
import {
  formatNumber,
  formatRelativeDate,
  getInitials,
  nameToColor,
  cn,
} from "@/lib/utils";
import { Trophy, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import type { Profile } from "@dynamic-rewards/shared/types";

const PAGE_SIZE = 20;

const RANK_COLORS: Record<number, { accent: string; bg: string }> = {
  1: { accent: "#FFD700", bg: "rgba(255, 215, 0, 0.12)" },
  2: { accent: "#C0C0C0", bg: "rgba(192, 192, 192, 0.12)" },
  3: { accent: "#CD7F32", bg: "rgba(205, 127, 50, 0.12)" },
};

function PodiumCard({
  profile,
  rank,
  delay,
}: {
  profile: Profile;
  rank: number;
  delay: number;
}) {
  const router = useRouter();
  const colors = RANK_COLORS[rank];
  const isFirst = rank === 1;

  return (
    <div
      className={cn(
        "animate-in card-hover bg-card rounded-xl border border-border p-5 flex flex-col items-center text-center cursor-pointer relative overflow-hidden",
        isFirst ? "md:-mt-4 md:pb-7" : "md:mt-2"
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => router.push(`/employees/${profile.id}`)}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: colors?.accent }}
      />

      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mb-3"
        style={{ backgroundColor: colors?.accent }}
      >
        {rank}
      </div>

      <div
        className={cn(
          "rounded-full flex items-center justify-center font-semibold text-white shrink-0",
          isFirst ? "w-16 h-16 text-xl" : "w-12 h-12 text-base"
        )}
        style={{ backgroundColor: nameToColor(profile.name) }}
      >
        {getInitials(profile.name)}
      </div>

      <p
        className={cn(
          "font-heading font-semibold text-foreground mt-3 truncate w-full",
          isFirst ? "text-base" : "text-sm"
        )}
      >
        {profile.name}
      </p>

      <p
        className={cn(
          "font-mono font-bold mt-1",
          isFirst ? "text-2xl" : "text-xl"
        )}
        style={{ color: colors?.accent }}
      >
        {formatNumber(profile.point_balance)}
      </p>
      <p className="text-xs text-muted-foreground">points</p>
    </div>
  );
}

export function EmployeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const offset = (page - 1) * PAGE_SIZE;

  const { data, isLoading } = useEmployees(PAGE_SIZE, offset);

  const profiles = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const top3 = page === 1 ? profiles.slice(0, 3) : [];
  const tableProfiles = page === 1 ? profiles.slice(3) : profiles;
  const tableStartRank = page === 1 ? 4 : offset + 1;

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(p));
    }
    const qs = params.toString();
    router.push(qs ? `/employees?${qs}` : "/employees");
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-44 bg-card rounded-xl border border-border animate-pulse"
            />
          ))}
        </div>
        <div className="bg-card rounded-xl border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 border-b border-border animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const showFrom = total > 0 ? offset + 1 : 0;
  const showTo = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="animate-in flex items-center gap-3"
        style={{ animationDelay: "0ms" }}
      >
        <div className="p-2.5 rounded-lg bg-warning/10">
          <Trophy className="w-5 h-5 text-warning" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Leaderboard
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary font-mono">
              {total}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Employee rankings by reward points
          </p>
        </div>
      </div>

      {/* Podium - only on page 1 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-end">
          {/* #2 - left (on desktop), hidden on mobile */}
          {top3[1] ? (
            <div className="hidden md:block">
              <PodiumCard profile={top3[1]} rank={2} delay={100} />
            </div>
          ) : (
            <div className="hidden md:block" />
          )}
          {/* #1 - center (always first on mobile) */}
          <PodiumCard profile={top3[0]} rank={1} delay={50} />
          {/* #2 - mobile only (show after #1) */}
          {top3[1] && (
            <div className="md:hidden">
              <PodiumCard profile={top3[1]} rank={2} delay={100} />
            </div>
          )}
          {/* #3 - right */}
          {top3[2] ? (
            <PodiumCard profile={top3[2]} rank={3} delay={150} />
          ) : (
            <div className="hidden md:block" />
          )}
        </div>
      )}

      {/* Table */}
      {tableProfiles.length > 0 && (
        <div
          className="animate-in bg-card rounded-xl border border-border overflow-hidden"
          style={{ animationDelay: "200ms" }}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-16">
                  Rank
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                  Name
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                  Points
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 hidden sm:table-cell">
                  Onboarded
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 hidden md:table-cell">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {tableProfiles.map((profile, i) => {
                const rank = tableStartRank + i;

                return (
                  <tr
                    key={profile.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/employees/${profile.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-mono text-muted-foreground">
                        #{rank}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                          style={{
                            backgroundColor: nameToColor(profile.name),
                          }}
                        >
                          {getInitials(profile.name)}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">
                          {profile.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-mono font-medium text-foreground">
                        {formatNumber(profile.point_balance)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                      {profile.onboarded ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/10">
                          <Check className="w-3 h-3 text-success" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive/10">
                          <X className="w-3 h-3 text-destructive" />
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeDate(profile.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div
          className="animate-in flex items-center justify-between"
          style={{ animationDelay: "250ms" }}
        >
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-mono font-medium text-foreground">
              {showFrom}-{showTo}
            </span>{" "}
            of{" "}
            <span className="font-mono font-medium text-foreground">
              {total}
            </span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border transition-colors",
                page <= 1
                  ? "opacity-40 cursor-not-allowed text-muted-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <span className="text-sm text-muted-foreground px-2">
              <span className="font-mono font-medium text-foreground">
                {page}
              </span>{" "}
              / {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border transition-colors",
                page >= totalPages
                  ? "opacity-40 cursor-not-allowed text-muted-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {profiles.length === 0 && !isLoading && (
        <div className="animate-in text-center py-16">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No profiles yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Profiles will appear here once data is seeded.
          </p>
        </div>
      )}
    </div>
  );
}
