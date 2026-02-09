import { Suspense } from "react";
import { EmployeeDetail } from "@/components/employees/employee-profile";

function EmployeeDetailSkeleton() {
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
      <div className="h-6 w-36 bg-muted rounded animate-pulse" />
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

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<EmployeeDetailSkeleton />}>
      <EmployeeDetail id={id} />
    </Suspense>
  );
}
