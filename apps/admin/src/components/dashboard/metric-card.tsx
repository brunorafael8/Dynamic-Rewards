import type { LucideIcon } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

const COLOR_MAP = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
  },
  success: {
    bg: "bg-success/10",
    text: "text-success",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
  },
  accent: {
    bg: "bg-accent/10",
    text: "text-accent",
  },
} as const;

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: keyof typeof COLOR_MAP;
  delay?: number;
  subtitle?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  delay = 0,
  subtitle,
}: MetricCardProps) {
  const colors = COLOR_MAP[color];
  const displayValue =
    typeof value === "number" ? formatNumber(value) : value;

  return (
    <div
      className="animate-in card-hover bg-card rounded-xl border border-border p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-heading font-bold text-card-foreground">
            {displayValue}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-lg", colors.bg)}>
          <Icon className={cn("w-5 h-5", colors.text)} />
        </div>
      </div>
    </div>
  );
}
