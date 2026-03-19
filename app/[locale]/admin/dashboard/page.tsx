// app/[locale]/admin/dashboard/page.tsx
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin, getAdminScope } from '@/lib/auth/client'
import { Users, ShieldCheck, MessageSquare, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Admin Dashboard · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const admin = await requireAdmin()
  const supabase = createAdminClient()
  const role = admin.app_metadata?.['role'] as string ?? 'admin'
  const scope = await getAdminScope(admin.id, role)

  // Build scoped queries — admins only see their assigned users
  let profilesQuery     = supabase.from('profiles').select('*', { count: 'exact', head: true })
  let kycCountQuery     = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('kyc_status', 'pending')
  let recentKycQuery    = supabase.from('profiles').select('id, full_name, email, kyc_status').eq('kyc_status', 'pending').limit(5)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  let disputesCountQuery = supabaseAny.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open')
  let recentDisputesQuery = supabaseAny.from('disputes').select('id,reason,status,user_id').eq('status','open').order('created_at',{ascending:false}).limit(5)

  if (scope !== 'all' && scope.length > 0) {
    profilesQuery      = profilesQuery.in('id', scope)
    kycCountQuery      = kycCountQuery.in('id', scope)
    recentKycQuery     = recentKycQuery.in('id', scope)
    disputesCountQuery = disputesCountQuery.in('user_id', scope)
    recentDisputesQuery = recentDisputesQuery.in('user_id', scope)
  } else if (scope !== 'all' && scope.length === 0) {
    // No assignments — show empty
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-semibold text-foreground mb-2">No users assigned yet</h2>
          <p className="text-sm text-muted-foreground">
            Ask a superadmin to assign customers to your account before you can manage them.
          </p>
        </div>
      </div>
    )
  }

  const [
    { count: totalUsers },
    { count: pendingKyc },
    { count: openDisputes },
    { data: recentKyc },
    { data: recentDisputes },
  ] = await Promise.all([
    profilesQuery,
    kycCountQuery,
    disputesCountQuery,
    recentKycQuery,
    recentDisputesQuery,
  ])

  const disputeProfiles = await Promise.all(
    ((recentDisputes ?? []) as Array<{id:string;reason:string;status:string;user_id:string}>).map(async (d) => {
      const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', d.user_id).single()
      return { ...d, profile_name: profile?.full_name ?? profile?.email ?? 'Unknown' }
    })
  )

  const scopeLabel = scope === 'all' ? 'all customers' : `${scope.length} assigned customer${scope.length !== 1 ? 's' : ''}`

  const kpis = [
    { label: 'Assigned customers', value: (totalUsers ?? 0).toLocaleString(), Icon: Users,         color: 'bg-blue-500/10 text-blue-400',   href: '/admin/customers' },
    { label: 'Pending KYC',        value: (pendingKyc ?? 0).toString(),       Icon: ShieldCheck,   color: 'bg-amber-500/10 text-amber-400', href: '/admin/kyc-review' },
    { label: 'Open disputes',      value: (openDisputes ?? 0).toString(),      Icon: MessageSquare, color: 'bg-purple-500/10 text-purple-400',href: '/admin/disputes' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Viewing {scopeLabel}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {kpis.map(({ label, value, Icon, color, href }) => (
          <Link key={label} href={href}
            className="bg-card rounded-xl border border-border p-4 hover:border-border/80 hover:bg-muted/30 transition-all">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums mono-val">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending KYC */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <h2 className="font-semibold text-foreground">KYC awaiting review</h2>
            <Link href="/admin/kyc-review" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border/50">
            {(recentKyc ?? []).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" /> All caught up!
              </div>
            ) : (recentKyc ?? []).map((u) => (
              <Link key={u.id} href={`/admin/customers/${u.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {(u.full_name ?? u.email ?? '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name ?? 'Unnamed'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 shrink-0">
                  <Clock className="h-3 w-3" /> Pending
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Open disputes */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <h2 className="font-semibold text-foreground">Open disputes</h2>
            <Link href="/admin/disputes" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border/50">
            {disputeProfiles.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" /> No open disputes
              </div>
            ) : disputeProfiles.map((d) => (
              <Link key={d.id} href="/admin/disputes"
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.profile_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.reason}</p>
                </div>
                <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full shrink-0">
                  {d.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
