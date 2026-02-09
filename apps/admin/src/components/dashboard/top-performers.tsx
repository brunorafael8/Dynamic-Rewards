import type { Employee } from "@dynamic-rewards/shared/types";
import { getInitials, nameToColor, formatNumber } from "@/lib/utils";
import Link from "next/link";

const RANK_COLORS: Record<number, string> = {
  0: "#FFD700",
  1: "#C0C0C0",
  2: "#CD7F32",
};

interface TopPerformersProps {
  employees: Employee[];
}

export function TopPerformers({ employees }: TopPerformersProps) {
  if (employees.length === 0) return null;

  const maxPoints = employees[0]?.point_balance ?? 1;

  return (
    <div
      className="animate-in bg-card rounded-xl border border-border p-6"
      style={{ animationDelay: "200ms" }}
    >
      <h2 className="font-heading font-semibold text-foreground mb-4">
        Top Performers
      </h2>
      <div className="space-y-3">
        {employees.map((employee, index) => {
          const percentage =
            maxPoints > 0
              ? Math.round((employee.point_balance / maxPoints) * 100)
              : 0;

          return (
            <Link
              key={employee.id}
              href={`/employees/${employee.id}`}
              className="flex items-center gap-4 group"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={
                  index < 3
                    ? {
                        backgroundColor: RANK_COLORS[index],
                        color: "#FFFFFF",
                      }
                    : undefined
                }
              >
                {index >= 3 && (
                  <span className="text-muted-foreground">{index + 1}</span>
                )}
                {index < 3 && index + 1}
              </div>

              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                style={{ backgroundColor: nameToColor(employee.name) }}
              >
                {getInitials(employee.name)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {employee.name}
                  </span>
                  <span className="text-sm font-mono text-muted-foreground ml-2 shrink-0">
                    {formatNumber(employee.point_balance)} pts
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gradient-start to-gradient-end transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
