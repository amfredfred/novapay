// app/[locale]/(client)/dashboard/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
  ArrowUpRight, ArrowDownLeft, RefreshCw, CreditCard,
  Plus, TrendingUp, Eye, EyeOff,
} from 'lucide-react'
import type { Currency } from '@/types'
import { RecentTransactions } from './_components/recent-transactions'
import { SpendingChart } from './_components/spending-chart'
import { BalanceToggle } from './_components/balance-toggle'

export const metadata: Metadata = { title: 'Dashboard · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function ClientDashboardPage() {
  const user = await requireClient()
  const supabase = await createClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [
    { data: accounts, count: accountCount },
    { data: recentTxs },
    { data: cards },
    { data: profile },
    { data: spendingTxs },
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, products(name,type)', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_blocked', false)
      .order('is_primary', { ascending: false }),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('occurred_at', { ascending: false })
      .limit(10),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('cards')
      .select('id,account_id,user_id,product_id,last_four,card_type,network,status,expires_at,is_virtual,daily_limit,monthly_spent')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(3),
    supabase
      .from('profiles')
      .select('full_name, kyc_status')
      .eq('id', user.id)
      .single(),
    supabase
      .from('transactions')
      .select('occurred_at, amount, currency')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .gte('occurred_at', thirtyDaysAgo)
      .order('occurred_at', { ascending: true }),
  ])

  // Redirect new users to onboarding if no accounts
  if ((accountCount ?? 0) === 0) {
    const { redirect: r } = await import('next/navigation')
    r('/onboarding')
  }

  const primaryAccount = (accounts ?? []).find((a) => a.is_primary)
  const totalEurEquiv = (accounts ?? []).reduce(
    (s, a) => s + a.balance,
    0,
  )

  // Build daily spend/income buckets for last 30 days
  const spendMap = new Map<string, { spent: number; income: number }>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    spendMap.set(key, { spent: 0, income: 0 })
  }
  for (const tx of (spendingTxs ?? []) as { occurred_at: string; amount: number; currency: string }[]) {
    const key = new Date(tx.occurred_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const bucket = spendMap.get(key)
    if (bucket) {
      if (tx.amount < 0) bucket.spent  = Math.round((bucket.spent  + Math.abs(tx.amount)) * 100) / 100
      else               bucket.income = Math.round((bucket.income + tx.amount)            * 100) / 100
    }
  }
  const chartData = [...spendMap.entries()].map(([day, v]) => ({ day, ...v }))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Good morning, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's your financial overview</p>
        </div>
        <Link
          href="/transfer"
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New transfer
        </Link>
      </div>

      {/* Total balance hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white">
        <p className="text-primary-foreground/70 text-sm font-medium mb-1">Total balance (EUR equiv.)</p>
        <BalanceToggle value={totalEurEquiv} currency="EUR" />
        <div className="flex items-center gap-4 mt-5 pt-5 border-t border-white/20">
          {[
            { href: '/transfer', Icon: ArrowUpRight, label: 'Send' },
            { href: '/transfer?type=receive', Icon: ArrowDownLeft, label: 'Receive' },
            { href: '/exchange', Icon: RefreshCw, label: 'Exchange' },
            { href: '/cards', Icon: CreditCard, label: 'Cards' },
          ].map(({ href, Icon, label }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors"
            >
              <div className="w-10 h-10 bg-card/15 rounded-xl flex items-center justify-center hover:bg-card/25 transition-colors">
                <Icon className="h-4 w-4" />
              </div>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Accounts grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Accounts</h2>
          <Link href="/accounts" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(accounts ?? []).map((acct) => {
            const product = (Array.isArray(acct.products) ? (acct.products as unknown as { name: string; type: string }[])[0] : acct.products) as { name: string; type: string } | null
            return (
              <Link
                key={acct.id}
                href={`/accounts/${acct.id}`}
                className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {product?.name ?? acct.currency}
                  </span>
                  {acct.is_primary && (
                    <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full border border-primary/20">
                      Primary
                    </span>
                  )}
                </div>
                <div className="font-mono text-xl font-semibold text-foreground tabular-nums">
                  {formatCurrency(acct.balance, acct.currency as Currency)}
                </div>

              </Link>
            )
          })}
          <Link
            href="/accounts"
            className="bg-muted/50 rounded-xl border border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-all"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-medium">Add account</span>
          </Link>
        </div>
      </div>

      {/* Charts + recent txs */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <SpendingChart data={chartData} />
        <RecentTransactions transactions={recentTxs ?? []} />
      </div>

      {/* Cards */}
      {(cards ?? []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Cards</h2>
            <Link href="/cards" className="text-sm text-primary hover:underline">Manage cards</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(cards ?? []).map((rawCard: unknown) => { const card = rawCard as import('@/types/supabase').Card; return (
              <Link
                key={card.id}
                href="/cards"
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 text-white relative overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {card.card_type}
                  </span>
                  <span className="text-sm font-semibold capitalize">{card.network}</span>
                </div>
                <div className="font-mono text-sm tracking-widest text-gray-300 mb-2">
                  •••• •••• •••• {card.last_four}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Expires {new Date(card.expires_at).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${card.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {card.status}
                  </span>
                </div>
              </Link>
            )})}
          </div>
        </div>
      )}
    </div>
  )
}
