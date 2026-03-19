import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { TransferMethodsClient } from './_components/transfer-methods-client'

export const metadata: Metadata = { title: 'Transfer Methods · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function TransferMethodsPage() {
  await requireSuperadmin()
  const supabase = createAdminClient()
  const { data } = await (supabase as any)
    .from('transfer_methods').select('*').order('sort_order')
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transfer Methods</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure how clients can send money. Each method appears on the Send money screen.</p>
      </div>
      <TransferMethodsClient initialMethods={data ?? []} />
    </div>
  )
}
