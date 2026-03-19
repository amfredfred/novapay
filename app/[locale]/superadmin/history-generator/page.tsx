// app/[locale]/(superadmin)/history-generator/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import { HistoryGeneratorClient } from './_components/history-generator-client'

export const metadata: Metadata = { title: 'History Generator' }
export const dynamic = 'force-dynamic'

async function getActiveUsers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('account_status', 'active')
    .order('full_name')
    .limit(500)

  if (error) throw new Error(error.message)
  return data ?? []
}

export default async function HistoryGeneratorPage() {
  await requireSuperadmin()
  const users = await getActiveUsers()

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History Generator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Synthesise realistic historical transactions and import them into any active user account.
          All imports are immutably audit-logged.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <Skeleton className="h-[560px] rounded-xl" />
            <Skeleton className="h-[560px] rounded-xl" />
          </div>
        }
      >
        <HistoryGeneratorClient users={users} />
      </Suspense>
    </div>
  )
}
