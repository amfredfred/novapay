// app/[locale]/superadmin/gateways/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { GatewaysClient } from './_components/gateways-client'
import type { PaymentGateway } from '@/types/supabase'

export const metadata: Metadata = { title: 'Payment Gateways · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function GatewaysPage() {
  await requireSuperadmin()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('payment_gateways')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment Gateways</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure deposit methods users can pay through. Each gateway has full instructions
          and payment details shown to users when they request a deposit.
        </p>
      </div>
      <GatewaysClient initialGateways={(data ?? []) as PaymentGateway[]} />
    </div>
  )
}
