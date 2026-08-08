// app/[locale]/(superadmin)/system/_components/system-health-panel.tsx
// Every number here is measured live against the real Supabase project —
// no hardcoded/simulated figures.
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

async function measure() {
  const supabase = await createClient()
  const start = Date.now()
  const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
  const dbLatencyMs = Date.now() - start
  const dbConnected = !error

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [{ count: completed }, { count: failed }] = await Promise.all([
    supabase.from('transactions').select('*', { count: 'exact', head: true })
      .eq('status', 'completed').gte('created_at', thirtyDaysAgo),
    supabase.from('transactions').select('*', { count: 'exact', head: true })
      .in('status', ['failed', 'reversed']).gte('created_at', thirtyDaysAgo),
  ])

  const totalTx = (completed ?? 0) + (failed ?? 0)
  const successRatePct = totalTx > 0 ? Math.round(((completed ?? 0) / totalTx) * 1000) / 10 : null

  return { dbConnected, dbLatencyMs, successRatePct, totalTx }
}

export async function SystemHealthPanel() {
  const { dbConnected, dbLatencyMs, successRatePct, totalTx } = await measure()

  const rows = [
    {
      label: 'Database (Supabase Postgres)',
      ok: dbConnected,
      value: dbConnected ? `${dbLatencyMs}ms` : 'unreachable',
    },
    {
      label: `Transaction success rate (30d, n=${totalTx})`,
      ok: successRatePct === null || successRatePct >= 99,
      value: successRatePct === null ? 'no data yet' : `${successRatePct}%`,
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">System health</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2.5">
              <Circle
                className={cn(
                  'h-2.5 w-2.5',
                  row.ok ? 'fill-emerald-500 text-emerald-500' : 'fill-destructive text-destructive',
                )}
              />
              <span className="text-sm">{row.label}</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{row.value}</span>
          </div>
        ))}
        <p className="px-6 py-3 text-xs text-muted-foreground">
          Measured live on page load — not a monitoring service.
        </p>
      </CardContent>
    </Card>
  )
}
