// app/[locale]/(superadmin)/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function SuperadminLoading() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* KPI grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Skeleton className="h-[360px] rounded-xl" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
    </div>
  )
}
