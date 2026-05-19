export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-panel ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="w-full max-w-xl">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/3 mb-4" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>

      <div className="mt-6">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
