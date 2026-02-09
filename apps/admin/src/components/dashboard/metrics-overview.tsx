"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { MetricCard } from "./metric-card";
import { TopPerformers } from "./top-performers";
import { BookOpen, Users, Trophy, Zap } from "lucide-react";
import type { Employee, RewardRule } from "@dynamic-rewards/shared/types";
import Link from "next/link";

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number };
}

export function DashboardContent() {
  const employees = useQuery({
    queryKey: queryKeys.employees.list({ limit: 5, offset: 0 }),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>(
        "/employees?limit=5&offset=0"
      );
      return data;
    },
  });

  const activeRules = useQuery({
    queryKey: queryKeys.rules.list({ active: true }),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<RewardRule>>(
        "/rules?active=true&limit=1"
      );
      return data;
    },
  });

  const allRules = useQuery({
    queryKey: queryKeys.rules.list(),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<RewardRule>>(
        "/rules?limit=1"
      );
      return data;
    },
  });

  const totalEmployees = employees.data?.meta.total ?? 0;
  const totalActiveRules = activeRules.data?.meta.total ?? 0;
  const totalRules = allRules.data?.meta.total ?? 0;
  const topEmployees = employees.data?.data ?? [];
  const totalPoints = topEmployees.reduce((s, p) => s + p.point_balance, 0);

  const isLoading =
    employees.isLoading || activeRules.isLoading || allRules.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-card rounded-xl border border-border animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Welcome back
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your rewards engine
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Employees"
          value={totalEmployees}
          icon={Users}
          color="primary"
          delay={0}
        />
        <MetricCard
          label="Active Rules"
          value={totalActiveRules}
          icon={BookOpen}
          color="success"
          delay={50}
          subtitle={`${totalRules} total`}
        />
        <MetricCard
          label="Points Distributed"
          value={totalPoints}
          icon={Trophy}
          color="warning"
          delay={100}
        />
        <MetricCard
          label="Rules Engine"
          value={totalActiveRules > 0 ? "Active" : "Idle"}
          icon={Zap}
          color="accent"
          delay={150}
        />
      </div>

      {topEmployees.length > 0 && <TopPerformers employees={topEmployees} />}

      <div className="animate-in flex flex-wrap gap-3" style={{ animationDelay: "250ms" }}>
        <Link
          href="/processing"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Process Events
        </Link>
        <Link
          href="/rules"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Manage Rules
        </Link>
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
        >
          <Users className="w-4 h-4" />
          View Leaderboard
        </Link>
      </div>
    </div>
  );
}
