// app/[locale]/(client)/receive/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { ReceiveClient } from './receive-client'
import type { PaymentGateway } from '@/types/supabase'

export const metadata: Metadata = { title: 'Receive Money · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function ReceivePage() {
  const user = await requireClient()
  const supabase = await createClient()

  const [{ data: accounts }, { data: rawGateways }, { data: rawDeposits }] = await Promise.all([
    supabase.from('accounts').select('id, balance, currency, products(name)').eq('user_id', user.id).eq('is_blocked', false),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('payment_gateways').select('*').eq('is_active', true).order('sort_order'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('deposits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  return (
    <ReceiveClient
      accounts={(accounts ?? []).map(a => ({
        id:       a.id,
        currency: a.currency,
        balance:  a.balance,
        name:     (Array.isArray(a.products) ? (a.products as {name:string}[])[0]?.name : (a.products as {name:string}|null)?.name) ?? a.currency,
      }))}
      gateways={(rawGateways ?? []) as PaymentGateway[]}
      deposits={(rawDeposits ?? []) as Array<Record<string, unknown>>}
    />
  )
}
