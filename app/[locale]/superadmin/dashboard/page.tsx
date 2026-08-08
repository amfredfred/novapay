// app/[locale]/(superadmin)/dashboard/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { formatCurrencyCompact } from '@/lib/utils'
import {
  Users, Activity, TrendingUp, AlertTriangle,
  Clock, ServerCog, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardCharts } from './_components/dashboard-charts'
import { QuickActions } from './_components/quick-actions'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Dashboard' }

// PPR: this segment is dynamically rendered but children can be static
export const dynamic = 'force-dynamic'

/** Percent change vs. a count taken 30 days ago. Null when there's nothing to compare against. */
function pctChange(current: number, past: number): number | null {
  if (past === 0) return null
  return Math.round(((current - past) / past) * 1000) / 10
}

async function getDashboardData() {
  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [
    { count: totalUsers },
    { count: usersThirtyDaysAgo },
    { count: activeAccounts },
    { count: accountsThirtyDaysAgo },
    { count: pendingKyc },
    { count: fraudToday },
    { data: balances },
    { data: revenueData },
    { count: txCompleted30d },
    { count: txFailed30d },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).lt('created_at', thirtyDaysAgo),
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_blocked', false),
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_blocked', false).lt('created_at', thirtyDaysAgo),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
    supabase.from('fraud_flags')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
    supabase.from('account_balances_by_currency').select('*'),
    supabase.rpc('get_revenue_trend', { months_back: 12 }),
    supabase.from('transactions').select('*', { count: 'exact', head: true })
      .eq('status', 'completed').gte('created_at', thirtyDaysAgo),
    supabase.from('transactions').select('*', { count: 'exact', head: true })
      .in('status', ['failed', 'reversed']).gte('created_at', thirtyDaysAgo),
  ])

  const completed = txCompleted30d ?? 0
  const failed = txFailed30d ?? 0
  const totalTx = completed + failed

  return {
    totalUsers:      totalUsers ?? 0,
    usersTrend:      pctChange(totalUsers ?? 0, usersThirtyDaysAgo ?? 0),
    activeAccounts:  activeAccounts ?? 0,
    accountsTrend:   pctChange(activeAccounts ?? 0, accountsThirtyDaysAgo ?? 0),
    pendingKyc:      pendingKyc ?? 0,
    fraudToday:      fraudToday ?? 0,
    // Real success rate over the last 30 days of transactions, not a hardcoded figure.
    systemHealthPct: totalTx > 0 ? Math.round((completed / totalTx) * 1000) / 10 : 100,
    balances:        balances ?? [],
    revenueData:     (revenueData ?? []) as Array<{ month: string; revenue: number; tx_count: number }>,
  }
}

interface KpiCardProps {
  label: string
  value: string
  icon: React.ElementType
  trend?: { value: number; label: string }
  intent?: 'default' | 'success' | 'warning' | 'danger'
}

function KpiCard({ label, value, icon: Icon, trend, intent = 'default' }: KpiCardProps) {
  const intentStyles = {
    default: 'bg-muted/60 text-muted-foreground',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger:  'bg-destructive/10 text-destructive',
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
            {trend && (
              <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
                trend.value >= 0 ? 'text-emerald-600' : 'text-destructive'
              }`}>
                {trend.value >= 0
                  ? <ArrowUpRight className="h-3 w-3" />
                  : <ArrowDownRight className="h-3 w-3" />
                }
                {Math.abs(trend.value)}% {trend.label}
              </div>
            )}
          </div>
          <div className={`shrink-0 rounded-lg p-2 ${intentStyles[intent]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  await requireSuperadmin()
  const data = await getDashboardData()

  const totalVolume = (data.balances as Array<{currency:string;total_balance:number}>).reduce(
    (sum, b) => sum + (b.total_balance ?? 0),
    0,
  )

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total users"
          value={data.totalUsers.toLocaleString()}
          icon={Users}
          {...(data.usersTrend !== null ? { trend: { value: data.usersTrend, label: 'vs 30 days ago' } } : {})}
        />
        <KpiCard
          label="Active accounts"
          value={data.activeAccounts.toLocaleString()}
          icon={Activity}
          {...(data.accountsTrend !== null ? { trend: { value: data.accountsTrend, label: 'vs 30 days ago' } } : {})}
        />
        <KpiCard
          label="Total volume"
          value={formatCurrencyCompact(totalVolume, 'EUR')}
          icon={TrendingUp}
        />
        <KpiCard
          label="Fraud flags today"
          value={data.fraudToday.toString()}
          icon={AlertTriangle}
          intent={data.fraudToday > 5 ? 'danger' : 'default'}
        />
        <KpiCard
          label="Pending KYC"
          value={data.pendingKyc.toString()}
          icon={Clock}
          intent={data.pendingKyc > 50 ? 'warning' : 'default'}
        />
        <KpiCard
          label="System health"
          value={`${data.systemHealthPct}%`}
          icon={ServerCog}
          intent="success"
        />
      </div>

      {/* Charts + Quick actions */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Suspense fallback={<Skeleton className="h-[360px] rounded-xl" />}>
          <DashboardCharts revenueData={data.revenueData} balanceData={(data.balances as Array<{currency:string;total_balance:number;account_count:number}>)} userCount={data.totalUsers} />
        </Suspense>
        <QuickActions />
      </div>
    </div>
  )
}
