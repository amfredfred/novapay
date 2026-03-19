// app/[locale]/(admin)/customers/page.tsx
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin, getAdminScope } from '@/lib/auth/client'
import { formatDate } from '@/lib/utils'
import { Search } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Customers · Admin' }
export const dynamic = 'force-dynamic'

interface SearchParams { [key: string]: string | undefined; search?: string; kyc?: string; status?: string; page?: string }
const PAGE_SIZE = 30

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin()
  const role  = admin.app_metadata?.['role'] as string
  const scope = await getAdminScope(admin.id, role)

  const supabase = createAdminClient()
  const sp = await searchParams
  const params: SearchParams = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))

  const page   = Math.max(1, parseInt(params.page ?? '1'))
  const search = params.search ?? ''

  let query = supabase
    .from('profiles')
    .select('id, email, full_name, kyc_status, account_status, created_at, last_login_at', { count: 'exact' })
    .neq('account_status', 'closed')  // exclude staff accounts
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  // ── Scope: admins only see assigned users ─────────────────────────────────
  if (scope !== 'all') {
    if (scope.length === 0) {
      // No assignments yet — show empty state
      return (
        <div className="p-6 max-w-6xl mx-auto">
          <h1 className="text-xl font-semibold mb-2">Customers</h1>
          <div className="rounded-xl border-2 border-dashed border-border p-16 text-center text-muted-foreground">
            <p className="font-semibold">No users assigned yet</p>
            <p className="text-sm mt-1">Ask your superadmin to assign users to your account</p>
          </div>
        </div>
      )
    }
    query = query.in('id', scope)
  }

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  if (params.kyc    && params.kyc    !== 'all') query = query.eq('kyc_status',     params.kyc)
  if (params.status && params.status !== 'all') query = query.eq('account_status', params.status)

  const { data: customers, count } = await query

  const KYC_COLORS: Record<string, string> = {
    verified:    'bg-green-500/10 text-green-600 border-green-500/20',
    pending:     'bg-amber-50 text-amber-700 border-amber-200',
    rejected:    'bg-red-500/10 text-red-600 border-red-200',
    not_started: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(count ?? 0).toLocaleString()} {scope !== 'all' ? 'assigned ' : ''}customer{count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input name="search" defaultValue={search} placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <select name="kyc" defaultValue={params.kyc ?? 'all'}
          className="px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
          <option value="all">All KYC</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="not_started">Not started</option>
        </select>
        <select name="status" defaultValue={params.status ?? 'all'}
          className="px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors">
          Filter
        </button>
      </form>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 label-xs">User</th>
              <th className="text-left px-4 py-3 label-xs">KYC</th>
              <th className="text-left px-4 py-3 label-xs">Status</th>
              <th className="text-left px-4 py-3 label-xs">Joined</th>
              <th className="text-left px-4 py-3 label-xs">Last login</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(customers ?? []).map(c => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{c.full_name ?? 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${KYC_COLORS[c.kyc_status] ?? ''}`}>
                    {c.kyc_status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${c.account_status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                    {c.account_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.created_at)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{c.last_login_at ? formatDate(c.last_login_at) : '—'}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${c.id}`}
                    className="text-xs font-medium text-primary hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {(customers ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(count ?? 0) > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {Math.ceil((count ?? 0) / PAGE_SIZE)}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`?page=${page - 1}`} className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors">← Prev</Link>}
            {page * PAGE_SIZE < (count ?? 0) && <Link href={`?page=${page + 1}`} className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
