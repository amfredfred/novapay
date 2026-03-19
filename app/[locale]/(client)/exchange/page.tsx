// app/[locale]/(client)/exchange/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { ExchangeForm } from './_components/exchange-form'

export const metadata: Metadata = { title: 'Exchange · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function ExchangePage() {
  const user     = await requireClient()
  const supabase = await createClient()

  const [{ data: accounts }, { data: fxRows }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, balance, currency, products(name)')
      .eq('user_id', user.id)
      .eq('is_blocked', false),
    (supabase as any)
      .from('fx_rates')
      .select('quote, rate')
      .eq('base', 'EUR'),
  ])

  // Build rates map { EUR:1, USD:1.087, ... }
  const rates: Record<string, number> = { EUR: 1 }
  for (const row of (fxRows ?? []) as Array<{ quote: string; rate: number }>) {
    rates[row.quote] = Number(row.rate)
  }

  // Only pass accounts the user actually has — no auto-create
  const accts = (accounts ?? []).map(a => ({
    id:       a.id,
    balance:  a.balance,
    currency: a.currency,
    products: (Array.isArray(a.products)
      ? (a.products as any[])[0]
      : a.products) ?? null,
  }))

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Exchange</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Convert between your existing accounts — rates updated daily
        </p>
      </div>

      {/* Live rate board */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Today's rates (vs EUR)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(rates).filter(([c]) => c !== 'EUR').map(([currency, rate]) => (
            <div key={currency} className="text-center p-2.5 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground font-mono">{currency}</p>
              <p className="text-sm font-semibold font-mono tabular-nums mt-0.5">{rate.toFixed(4)}</p>
            </div>
          ))}
        </div>
      </div>

      {accts.length < 2 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-2xl p-12 text-center">
          <p className="font-medium text-foreground mb-1">You need at least two accounts to exchange</p>
          <p className="text-sm text-muted-foreground">Open a second account in a different currency from the Accounts page.</p>
        </div>
      ) : (
        <ExchangeForm accounts={accts} rates={rates} />
      )}
    </div>
  )
}
