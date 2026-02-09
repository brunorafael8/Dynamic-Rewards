export function DashboardSkeleton() {
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
      <div className="h-80 bg-card rounded-xl border border-border animate-pulse" />
    </div>
  );
}
