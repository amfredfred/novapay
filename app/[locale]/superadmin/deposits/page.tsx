// app/[locale]/superadmin/deposits/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { DepositsReviewClient } from './_components/deposits-review-client'

export const metadata: Metadata = { title: 'Deposits · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function DepositsPage() {
  await requireSuperadmin()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawDeposits } = await (supabase as any)
    .from('deposits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  // Enrich with profile and gateway names
  const deposits = await Promise.all(
    ((rawDeposits ?? []) as Array<Record<string, unknown>>).map(async (d) => {
      const [{ data: profile }, { data: gateway }] = await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', d['user_id'] as string).single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('payment_gateways').select('name, logo_url').eq('id', d['gateway_id'] as string).single(),
      ])
      return {
        ...d,
        user_name:    profile?.full_name ?? profile?.email ?? 'Unknown',
        user_email:   profile?.email ?? '',
        gateway_name: (gateway as { name: string } | null)?.name ?? 'Unknown',
        gateway_logo: (gateway as { logo_url: string | null } | null)?.logo_url ?? null,
      }
    })
  )

  const pending = deposits.filter(d => (d as Record<string,unknown>)['status'] === 'pending' || (d as Record<string,unknown>)['status'] === 'payment_sent').length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deposit Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pending} pending · Review and approve user deposit requests. Approved deposits are credited instantly.
        </p>
      </div>
      <DepositsReviewClient deposits={deposits as never} />
    </div>
  )
}
