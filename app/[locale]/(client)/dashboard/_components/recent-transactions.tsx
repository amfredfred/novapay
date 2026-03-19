import Link from 'next/link'
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Tables, Currency } from '@/types/supabase'

type Tx = Tables<'transactions'>

export function RecentTransactions({ transactions }: { transactions: Tx[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h2 className="font-semibold text-foreground">Recent transactions</h2>
        <Link href="/transactions" className="text-sm text-primary hover:underline">View all</Link>
      </div>
      <div className="divide-y divide-border">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet</div>
        ) : transactions.map((tx) => {
          const isCredit = tx.amount > 0
          return (
            <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                isCredit ? 'bg-green-500/10' : 'bg-muted'
              }`}>
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
                <p className={`text-sm font-semibold font-mono tabular-nums ${isCredit ? 'text-green-600' : 'text-foreground'}`}>
                  {isCredit ? '+' : ''}{formatCurrency(tx.amount, tx.currency as Currency)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                  {tx.type.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
