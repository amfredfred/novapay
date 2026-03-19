// app/[locale]/(client)/accounts/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { TrendingUp, Landmark } from 'lucide-react'
import { OpenAccountModal } from './open-account-modal'
import type { Currency } from '@/types'

export const metadata: Metadata = { title: 'Accounts · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const user = await requireClient()
  const supabase = await createClient()

  const [{ data: accounts }, { data: products }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, products(name,type,monthly_fee,fee_currency)')
      .eq('user_id', user.id)
      .eq('is_blocked', false)
      .order('is_primary', { ascending: false }),
    supabase
      .from('products')
      .select('id,name,type,supported_currencies')
      .eq('is_active', true),
  ])

  const totalBalance = (accounts ?? []).reduce((s, a) => s + a.balance, 0)
  const existingCurrencies = (accounts ?? []).map(a => a.currency)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(accounts ?? []).length} account{(accounts ?? []).length !== 1 ? 's' : ''}
          </p>
        </div>
        <OpenAccountModal
          products={(products ?? []).map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            supported_currencies: (p.supported_currencies ?? []) as string[],
          }))}
          existingCurrencies={existingCurrencies}
        />
      </div>

      {/* Total */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-white">
        <p className="text-primary-foreground/70 text-sm font-medium mb-1">Total balance (EUR approx.)</p>
        <p className="text-4xl font-bold tabular-nums tracking-tight">
          {formatCurrency(totalBalance, 'EUR')}
        </p>
      </div>

      {/* Account cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {(accounts ?? []).map((acct) => {
          const product = (Array.isArray(acct.products)
            ? (acct.products as unknown as { name: string; type: string; monthly_fee: number; fee_currency: string }[])[0]
            : acct.products) as { name: string; type: string; monthly_fee: number; fee_currency: string } | null

          return (
            <Link key={acct.id} href={`/accounts/${acct.id}`}
              className="bg-card rounded-2xl border border-border p-5 hover:border-primary/30 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Landmark className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{product?.name ?? acct.currency}</p>
                    <p className="text-xs text-muted-foreground capitalize">{product?.type?.replace('_', ' ') ?? 'Account'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {acct.is_primary && (
                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-medium px-2 py-0.5 rounded-full">Primary</span>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">{acct.currency}</span>
                </div>
              </div>
              <div className="font-mono text-2xl font-semibold text-foreground tabular-nums mb-3">
                {formatCurrency(acct.balance, acct.currency as Currency)}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-3 w-3" /> Active
                </span>
                <span className="group-hover:text-primary transition-colors">View details →</span>
              </div>
              {product?.monthly_fee === 0 && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">No monthly fee</p>
              )}
              {product?.monthly_fee && product.monthly_fee > 0 ? (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                  {formatCurrency(product.monthly_fee, (product.fee_currency ?? 'EUR') as Currency)}/month
                </p>
              ) : null}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
