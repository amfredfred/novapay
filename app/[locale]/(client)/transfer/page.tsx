// app/[locale]/(client)/transfer/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { TransferForm } from './_components/transfer-form'

export const metadata: Metadata = { title: 'Send Money · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function TransferPage() {
  const user     = await requireClient()
  const supabase = await createClient()

  const [{ data: accounts }, { data: methods }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, balance, currency, products(name)')
      .eq('user_id', user.id)
      .eq('is_blocked', false),
    (supabase as any)
      .from('transfer_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Send money</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose a method and send funds securely
        </p>
      </div>
      <TransferForm
        accounts={(accounts ?? []).map(a => ({
          ...a,
          products: (Array.isArray(a.products)
            ? (a.products as any[])[0]
            : a.products) ?? null,
        }))}
        methods={methods ?? []}
      />
    </div>
  )
}
