import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/metrics-overview";
import { DashboardSkeleton } from "@/components/dashboard/metrics-loading";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
