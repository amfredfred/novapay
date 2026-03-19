// app/[locale]/(client)/accounts/[accountId]/page.tsx
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, CreditCard } from 'lucide-react'
import { CopyButton } from '../copy-button'
import type { Currency } from '@/types'
import type { Tables } from '@/types/supabase'

export const metadata: Metadata = { title: 'Account · NovaPay' }
export const dynamic = 'force-dynamic'

type Tx = Tables<'transactions'>

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const user = await requireClient()
  const { accountId } = await params
  const supabase = await createClient()

  const { data: account } = await supabase
    .from('accounts')
    .select('*, products(name, type, supported_currencies, monthly_fee, fee_currency, tx_limit_daily, tx_limit_monthly)')
    .eq('id', accountId)
    .eq('user_id', user.id)   // RLS — user can only see own accounts
    .single()

  if (!account) notFound()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('occurred_at', { ascending: false })
    .limit(50)

  const product = (Array.isArray(account.products) ? (account.products as unknown as { name: string; type: string; monthly_fee: number; fee_currency: string; tx_limit_daily: number; tx_limit_monthly: number }[])[0] : account.products) as {
    name: string; type: string; monthly_fee: number; fee_currency: string;
    tx_limit_daily: number; tx_limit_monthly: number
  } | null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All accounts
      </Link>

      {/* Account hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-primary-foreground/70 text-sm font-medium">{product?.name ?? account.currency}</p>
            <p className="text-4xl font-bold tabular-nums tracking-tight mt-1">
              {formatCurrency(account.balance, account.currency as Currency)}
            </p>
          </div>
          <span className="text-xs bg-card/20 px-3 py-1 rounded-full font-mono">
            {account.currency}
          </span>
        </div>
        {/* IBAN */}
        {account.iban && (
          <div className="border-t border-white/20 pt-4">
            <p className="text-primary-foreground/70 text-xs mb-1">IBAN</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm">{account.iban}</p>
              <CopyButton value={account.iban!} />
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: '/transfer', label: 'Send money', Icon: ArrowUpRight },
          { href: '/transfer?type=receive', label: 'Receive', Icon: ArrowDownLeft },
          { href: '/cards', label: 'Linked cards', Icon: CreditCard },
        ].map(({ href, label, Icon }) => (
          <Link
            key={label}
            href={href}
            className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground/80">{label}</span>
          </Link>
        ))}
      </div>

      {/* Account details */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Account details</h2>
        </div>
        <div className="divide-y divide-border text-sm">
          {[
            ['Account ID', account.id.slice(0, 16) + '…'],
            ['Type', product?.type?.replace(/_/g, ' ') ?? '—'],
            ['Daily limit', product?.tx_limit_daily ? formatCurrency(product.tx_limit_daily, account.currency as Currency) : '—'],
            ['Monthly limit', product?.tx_limit_monthly ? formatCurrency(product.tx_limit_monthly, account.currency as Currency) : '—'],
            ['Monthly fee', product?.monthly_fee === 0 ? 'Free' : product?.monthly_fee ? formatCurrency(product.monthly_fee, (product.fee_currency ?? 'EUR') as Currency) : '—'],
            ['Status', account.is_blocked ? 'Blocked' : 'Active'],
            ['Opened', formatDateTime(account.opened_at)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground text-right font-mono text-xs">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Transactions</h2>
          <Link href="/transactions" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {(transactions ?? []).length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No transactions yet</div>
        ) : (
          <div className="divide-y divide-border">
            {(transactions as Tx[]).map((tx) => {
              const isCredit = tx.amount > 0
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-green-500/10' : 'bg-muted'}`}>
                    {isCredit
                      ? <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(tx.occurred_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold font-mono tabular-nums text-sm ${isCredit ? 'text-green-600' : 'text-foreground'}`}>
                      {isCredit ? '+' : ''}{formatCurrency(tx.amount, tx.currency as Currency)}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">{tx.status}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
