import { Suspense } from "react";
import { RuleDetail } from "./rule-detail";

function RuleDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-20 bg-muted rounded animate-pulse" />
      <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-card rounded-xl border border-border animate-pulse"
          />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-20 bg-card rounded-xl border border-border animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

interface RulePageProps {
  params: Promise<{ id: string }>;
}

export default async function RuleDetailPage({ params }: RulePageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<RuleDetailSkeleton />}>
      <RuleDetail id={id} />
    </Suspense>
  );
}
