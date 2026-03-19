// app/[locale]/(superadmin)/fees-limits/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { FeesLimitsClient } from './_components/fees-limits-client'

export const metadata: Metadata = { title: 'Fees & Limits' }
export const dynamic = 'force-dynamic'

export default async function FeesLimitsPage() {
  await requireSuperadmin()
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, type, tx_limit_daily, tx_limit_monthly')
    .eq('is_active', true)
    .order('name')

  const { data: fees } = await supabase
    .from('product_fees')
    .select('*')

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fees &amp; Limits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure fees and transaction limits per product. Changes are audit-logged and visible to users in their account settings.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        {[
          { label: 'SEPA fees', desc: 'Flat charges for domestic, EU, and international transfers. Set 0 for free. Shown to users at transfer confirmation.' },
          { label: 'Card & ATM fees', desc: 'Per-transaction fees for card payments and cash withdrawals. Shown in the cards section of the client app.' },
          { label: 'TX limits', desc: 'Maximum transaction amounts per day and month. Enforced by the transfer flow. Customers see their limits on the accounts page.' },
        ].map(({ label, desc }) => (
          <div key={label} className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
      <FeesLimitsClient products={products ?? []} fees={fees ?? []} />
    </div>
  )
}
