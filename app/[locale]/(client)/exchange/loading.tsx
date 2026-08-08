import { Skeleton } from '@/components/ui/skeleton'

export default function ExchangeLoading() {
  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}
