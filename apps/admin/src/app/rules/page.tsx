import { Suspense } from "react";
import { RulesContent } from "@/components/rules/rules-manager";

function RulesSkeleton() {
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
            className="h-16 border-b border-border animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default function RulesPage() {
  return (
    <Suspense fallback={<RulesSkeleton />}>
      <RulesContent />
    </Suspense>
  );
}
