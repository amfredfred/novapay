// app/[locale]/(admin)/customers/[customerId]/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/client'
import { formatCurrency, formatDateTime, getInitials } from '@/lib/utils'
import { ArrowLeft, ShieldCheck, UserX, UserCheck, RotateCcw } from 'lucide-react'
import { KycDocsViewer } from '@/components/kyc-docs-viewer'
import type { Currency } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminCustomerDetailPage({
  params,
}: { params: Promise<{ customerId: string }> }) {
  const admin = await requireAdmin()
  const { customerId } = await params
  const supabase = createAdminClient()

  // Scope check: admins can only view their assigned users
  const role = admin.app_metadata?.['role'] as string
  if (role !== 'superadmin') {
    const { getAdminScope } = await import('@/lib/auth/client')
    const scope = await getAdminScope(admin.id, role)
    if (scope !== 'all' && !scope.includes(customerId)) {
      const { notFound } = await import('next/navigation')
      notFound()
    }
  }

  const [{ data: profile }, { data: accounts }, { data: txs }, { data: kycDocs }, { data: disputes }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', customerId).single(),
    supabase.from('accounts').select('*, products(name)').eq('user_id', customerId),
    supabase.from('transactions').select('*').eq('user_id', customerId).order('occurred_at', { ascending: false }).limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('kyc_documents').select('*').eq('user_id', customerId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('disputes').select('*').eq('user_id', customerId).order('created_at', { ascending: false }),
  ])

  if (!profile) notFound()

  const KYC_BADGE: Record<string, string> = {
    verified:    'bg-green-500/10 text-green-600',
    pending:     'bg-amber-500/10 text-amber-600',
    rejected:    'bg-red-500/10 text-red-600',
    not_started: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xl font-semibold shrink-0">
          {getInitials(profile.full_name ?? profile.email ?? '?')}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{profile.full_name ?? 'Unnamed'}</h1>
          <p className="text-muted-foreground text-sm">{profile.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${KYC_BADGE[profile.kyc_status] ?? KYC_BADGE['not_started']}`}>
              KYC: {profile.kyc_status.replace('_', ' ')}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              profile.account_status === 'active' ? 'bg-green-500/10 text-green-600' :
              profile.account_status === 'suspended' ? 'bg-amber-500/10 text-amber-600' :
              'bg-muted text-muted-foreground'
            }`}>
              {profile.account_status}
            </span>
          </div>
        </div>
        {/* Admin actions */}
        <div className="flex items-center gap-2">
          {profile.kyc_status === 'pending' && (
            <>
              <form action={async () => {
                'use server'
                const s = createAdminClient()
                await s.from('profiles').update({ kyc_status: 'verified', kyc_verified_at: new Date().toISOString() }).eq('id', customerId)
              }}>
                <button type="submit" className="flex items-center gap-1.5 text-xs font-medium bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  <ShieldCheck className="h-3.5 w-3.5" /> Approve KYC
                </button>
              </form>
              <form action={async () => {
                'use server'
                const s = createAdminClient()
                await s.from('profiles').update({ kyc_status: 'rejected' }).eq('id', customerId)
              }}>
                <button type="submit" className="flex items-center gap-1.5 text-xs font-medium bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors">
                  Reject KYC
                </button>
              </form>
            </>
          )}
          {profile.account_status === 'active' ? (
            <form action={async () => {
              'use server'
              const s = createAdminClient()
              await s.from('profiles').update({ account_status: 'suspended' }).eq('id', customerId)
            }}>
              <button type="submit" className="flex items-center gap-1.5 text-xs font-medium border border-amber-300 text-amber-700 bg-amber-500/10 px-3 py-2 rounded-lg hover:bg-amber-500/20 transition-colors">
                <UserX className="h-3.5 w-3.5" /> Suspend
              </button>
            </form>
          ) : (
            <form action={async () => {
              'use server'
              const s = createAdminClient()
              await s.from('profiles').update({ account_status: 'active' }).eq('id', customerId)
            }}>
              <button type="submit" className="flex items-center gap-1.5 text-xs font-medium border border-green-300 text-green-700 bg-green-500/10 px-3 py-2 rounded-lg hover:bg-green-500/20 transition-colors">
                <UserCheck className="h-3.5 w-3.5" /> Unsuspend
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile details */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 text-sm">
          <h3 className="font-semibold text-foreground">Profile</h3>
          {[
            ['ID', profile.id.slice(0, 12) + '…'],
            ['Phone', profile.phone ?? '—'],
            ['DOB', profile.date_of_birth ?? '—'],
            ['Nationality', profile.nationality ?? '—'],
            ['Country', profile.country_of_residence ?? '—'],
            ['2FA', profile.two_fa_enabled ? 'Enabled' : 'Disabled'],
            ['Joined', formatDateTime(profile.created_at)],
            ['Last login', profile.last_login_at ? formatDateTime(profile.last_login_at) : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
              <span className="text-muted-foreground/70">{k}</span>
              <span className="font-medium text-right text-foreground font-mono text-xs">{v}</span>
            </div>
          ))}
        </div>

        {/* Accounts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="font-semibold text-foreground">Accounts</h3>
            </div>
            <div className="divide-y divide-border/50">
              {(accounts ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{((Array.isArray(a.products) ? (a.products as unknown as {name:string}[])[0] : a.products) as {name:string}|null)?.name ?? a.currency}</p>
                    <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">{a.iban ?? a.id.slice(0, 16)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-foreground">{formatCurrency(a.balance, a.currency as Currency)}</p>
                    {a.is_primary && <span className="text-[10px] text-primary">Primary</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="font-semibold text-foreground">Recent transactions</h3>
            </div>
            <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
              {(txs ?? []).slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm text-foreground truncate max-w-[200px]">{tx.description}</p>
                    <p className="text-xs text-muted-foreground/70 font-mono">{formatDateTime(tx.occurred_at)}</p>
                  </div>
                  <span className={`font-mono text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, tx.currency as Currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KYC Documents */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">KYC Documents</h3>
          {profile.kyc_status === 'pending' && (
            <div className="flex items-center gap-2">
              <form action={async () => {
                'use server'
                const s = createAdminClient()
                await s.from('profiles').update({ kyc_status: 'rejected' }).eq('id', customerId)
              }}>
                <button type="submit" className="flex items-center gap-1.5 text-xs text-red-600 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                  <UserX className="h-3.5 w-3.5" /> Reject KYC
                </button>
              </form>
              <form action={async () => {
                'use server'
                const s = createAdminClient()
                await s.from('profiles').update({ kyc_status: 'verified', kyc_verified_at: new Date().toISOString() }).eq('id', customerId)
              }}>
                <button type="submit" className="flex items-center gap-1.5 text-xs text-white bg-green-600 px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                  <ShieldCheck className="h-3.5 w-3.5" /> Approve KYC
                </button>
              </form>
            </div>
          )}
        </div>
        <div className="p-4">
          <KycDocsViewer userId={customerId} docs={kycDocs ?? []} />
        </div>
      </div>
    </div>
  )
}
