"use client"

/**
 * Premium skeleton loaders with a subtle shimmer.
 * Used for progressive rendering so users see structure instantly
 * instead of a full-screen blocker (improves perceived performance).
 */

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`mp-skeleton rounded-xl ${className}`} />
}

export function KpiSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="mp-card p-4 rounded-2xl">
          <div className="mp-skeleton h-2.5 w-16 rounded-full" />
          <div className="mp-skeleton mt-3 h-6 w-24 rounded-lg" />
          <div className="mp-skeleton mt-2 h-2.5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="mp-card p-5 rounded-2xl">
        <div className="mp-skeleton h-3 w-32 rounded-full" />
        <div className="mt-5 flex items-end gap-2 h-40">
          {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
            <div key={i} className="mp-skeleton flex-1 rounded-t-lg" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="mp-card p-5 rounded-2xl">
        <div className="mp-skeleton h-3 w-28 rounded-full" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="mp-skeleton h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <div className="mp-skeleton h-2.5 w-3/4 rounded-full" />
                <div className="mp-skeleton mt-1.5 h-2 w-1/2 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mp-card rounded-2xl p-5">
      <div className="mp-skeleton h-3 w-40 rounded-full" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="mp-skeleton h-9 w-9 rounded-lg" />
            <div className="mp-skeleton h-3 flex-1 rounded-full" />
            <div className="mp-skeleton h-3 w-16 rounded-full" />
            <div className="mp-skeleton h-3 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
