import { Suspense } from "react";
import { ProcessingContent } from "@/components/processing/batch-processor";

function ProcessingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-muted rounded-lg animate-pulse mt-2" />
      </div>
      <div className="h-48 bg-card rounded-xl border border-border animate-pulse" />
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={<ProcessingSkeleton />}>
      <ProcessingContent />
    </Suspense>
  );
}
