// app/[locale]/(admin)/transactions/page.tsx
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin, getAdminScope } from '@/lib/auth/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import type { Currency } from '@/types'

export const metadata: Metadata = { title: 'Transactions · Admin' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const admin = await requireAdmin()
  const role  = admin.app_metadata?.['role'] as string
  const scope = await getAdminScope(admin.id, role)

  const sp   = await searchParams
  const page = Math.max(1, parseInt((sp['page'] as string) ?? '1'))

  if (scope !== 'all' && scope.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-semibold mb-2">Transactions</h1>
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center text-muted-foreground">
          <p className="font-semibold">No users assigned yet</p>
          <p className="text-sm mt-1">Ask your superadmin to assign users to your account</p>
        </div>
      </div>
    )
  }

  // Use admin client — bypasses RLS, scope is enforced in-code
  const supabase = createAdminClient()

  let query = (supabase as any)
    .from('transactions')
    .select('id, occurred_at, description, amount, currency, type, status, user_id, is_deleted', { count: 'exact' })
    .eq('is_deleted', false)
    .order('occurred_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (scope !== 'all') {
    query = query.in('user_id', scope)
  }

  const { data: transactions, count } = await query

  // Fetch profile names for the user IDs in this page
  const userIds = [...new Set((transactions ?? []).map((t: any) => t.user_id))]
  const { data: profileRows } = userIds.length > 0
    ? await (supabase as any).from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] }

  const profileMap = Object.fromEntries(
    (profileRows ?? []).map((p: any) => [p.id, p])
  )

  const { data: fraudFlags } = await (supabase as any)
    .from('fraud_flags')
    .select('transaction_id')
    .eq('reviewed', false)
  const flaggedTxIds = new Set((fraudFlags ?? []).map((f: any) => f.transaction_id))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {(count ?? 0).toLocaleString()} total{scope !== 'all' ? ' across assigned users' : ''} · {flaggedTxIds.size} fraud flags
        </p>
      </div>

      {flaggedTxIds.size > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-400/30 rounded-xl px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {flaggedTxIds.size} transaction{flaggedTxIds.size !== 1 ? 's' : ''} flagged for fraud review
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 label-xs">Transaction</th>
              <th className="text-left px-4 py-3 label-xs">User</th>
              <th className="text-left px-4 py-3 label-xs">Date</th>
              <th className="text-right px-4 py-3 label-xs">Amount</th>
              <th className="text-left px-4 py-3 label-xs">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {((transactions ?? []) as any[]).map(tx => {
              const profile = profileMap[tx.user_id] as { full_name: string | null; email: string } | undefined
              const flagged  = flaggedTxIds.has(tx.id)
              const isCredit = tx.amount > 0
              return (
                <tr key={tx.id} className={`transition-colors ${flagged ? 'bg-amber-500/5' : 'hover:bg-muted/30'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-green-500/15' : 'bg-muted'}`}>
                        {isCredit
                          ? <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
                          : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                      </div>
                      <div>
                        <p className="font-medium text-xs truncate max-w-[180px]">{tx.description}</p>
                        {flagged && <span className="text-[10px] text-amber-600 font-semibold">⚠ Fraud flagged</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {profile?.full_name ?? profile?.email ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(tx.occurred_at)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${isCredit ? 'text-green-600' : ''}`}>
                    {isCredit ? '+' : ''}{formatCurrency(tx.amount, tx.currency as Currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      tx.status === 'completed'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              )
            })}
            {(transactions ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No transactions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
