import { Suspense } from "react";
import { EmployeesContent } from "@/components/employees/leaderboard";

function EmployeesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-36 bg-card rounded-xl border border-border animate-pulse"
          />
        ))}
      </div>
      <div className="bg-card rounded-xl border border-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-border animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={<EmployeesSkeleton />}>
      <EmployeesContent />
    </Suspense>
  );
}
