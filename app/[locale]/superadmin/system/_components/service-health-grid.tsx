// app/[locale]/(superadmin)/system/_components/service-health-grid.tsx
import { Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const SERVICES = [
  { name: 'API Gateway',         status: 'ok',   latencyMs: 12,  uptimePct: 99.98 },
  { name: 'Auth service',        status: 'ok',   latencyMs: 8,   uptimePct: 100 },
  { name: 'Payment rail (SEPA)', status: 'ok',   latencyMs: 34,  uptimePct: 99.94 },
  { name: 'KYC provider',        status: 'ok',   latencyMs: 89,  uptimePct: 99.7 },
  { name: 'FX data feed',        status: 'warn', latencyMs: 210, uptimePct: 98.2 },
  { name: 'Fraud engine',        status: 'ok',   latencyMs: 44,  uptimePct: 99.99 },
  { name: 'Supabase Realtime',   status: 'ok',   latencyMs: 5,   uptimePct: 100 },
  { name: 'Edge Functions',      status: 'ok',   latencyMs: 22,  uptimePct: 99.95 },
] as const

export function ServiceHealthGrid() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Service health</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {SERVICES.map((svc) => (
          <div key={svc.name} className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2.5">
              <Circle
                className={cn(
                  'h-2.5 w-2.5',
                  svc.status === 'ok'
                    ? 'fill-emerald-500 text-emerald-500'
                    : 'fill-amber-500 text-amber-500',
                )}
              />
              <span className="text-sm">{svc.name}</span>
            </div>
            <div className="flex items-center gap-5 font-mono text-xs text-muted-foreground">
              <span>{svc.latencyMs}ms</span>
              <span
                className={cn(
                  svc.uptimePct >= 99.9
                    ? 'text-success font-medium'
                    : svc.uptimePct >= 99
                      ? 'text-warning'
                      : 'text-destructive',
                )}
              >
                {svc.uptimePct}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
