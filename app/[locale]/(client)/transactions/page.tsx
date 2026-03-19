// app/[locale]/(client)/transactions/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ArrowUpRight, ArrowDownLeft, Download, SlidersHorizontal } from 'lucide-react'
import type { Currency } from '@/types'
import type { Tables } from '@/types/supabase'

export const metadata: Metadata = { title: 'Transactions · NovaPay' }
export const dynamic = 'force-dynamic'

type TxRow = Tables<'transactions'>

interface SearchParams {
  [key: string]: string | undefined
  type?: string
  from?: string
  to?: string
  page?: string
}

const PAGE_SIZE = 25

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireClient()
  const supabase = await createClient()
  const sp = await searchParams
  const params: SearchParams = Object.fromEntries(
    Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  )

  const page = Math.max(1, parseInt(params.page ?? '1'))

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('occurred_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (params.type) query = query.eq('type', params.type)
  if (params.from) query = query.gte('occurred_at', new Date(params.from).toISOString())
  if (params.to) query = query.lte('occurred_at', new Date(params.to).toISOString())

  const { data: transactions, count } = await query
  const pageCount = Math.ceil((count ?? 0) / PAGE_SIZE)

  const TX_TYPES = [
    'card_payment', 'sepa_transfer', 'atm_withdrawal', 'fx_exchange',
    'standing_order', 'direct_debit', 'salary', 'refund', 'fee', 'interest',
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{(count ?? 0).toLocaleString()} total transactions</p>
        </div>
        <a href="/transactions/export" className="flex items-center gap-2 border border-border text-muted-foreground text-sm font-medium px-4 py-2 rounded-xl hover:bg-muted/50 transition-colors">
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <form className="flex items-center gap-3 flex-wrap">
          <select
            name="type"
            defaultValue={params.type ?? ''}
            className="text-sm border border-border rounded-lg px-3 py-2 text-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="">All types</option>
            {TX_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ''}
            className="text-sm border border-border rounded-lg px-3 py-2 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ''}
            className="text-sm border border-border rounded-lg px-3 py-2 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="submit"
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-muted transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filter
          </button>
        </form>
      </div>

      {/* Transactions list */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {(transactions ?? []).length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-medium text-muted-foreground mb-1">No transactions found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(transactions as TxRow[]).map((tx) => {
              const isCredit = tx.amount > 0
              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isCredit ? 'bg-green-500/10' : 'bg-muted'
                  }`}>
                    {isCredit
                      ? <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-muted-foreground">{formatDateTime(tx.occurred_at)}</p>
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                        {tx.type.replace(/_/g, ' ')}
                      </span>

                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-semibold font-mono tabular-nums ${
                      isCredit ? 'text-green-600' : 'text-foreground'
                    }`}>
                      {isCredit ? '+' : ''}{formatCurrency(tx.amount, tx.currency as Currency)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{tx.status}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, count ?? 0)} of {count?.toLocaleString()}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?page=${page - 1}${params.type ? `&type=${params.type}` : ''}`}
                className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted/50"
              >
                Previous
              </a>
            )}
            {page < pageCount && (
              <a
                href={`?page=${page + 1}${params.type ? `&type=${params.type}` : ''}`}
                className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
