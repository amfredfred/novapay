// app/[locale]/(superadmin)/dashboard/_components/quick-actions.tsx
'use client'

import Link from 'next/link'
import { Zap, Package, Flag, ScrollText, Users, Settings, ArrowDownToLine, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const ACTIONS = [
  {
    href:  '/superadmin/deposits',
    label: 'Review deposits',
    desc:  'Approve pending requests',
    Icon:  ArrowDownToLine,
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
  {
    href:  '/superadmin/gateways',
    label: 'Manage gateways',
    desc:  'Payment methods config',
    Icon:  Globe,
    color: 'bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400',
  },
  {
    href:  '/superadmin/history-generator',
    label: 'Generate tx history',
    desc:  'Synthetic data import',
    Icon:  Zap,
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
  },
  {
    href:  '/superadmin/products',
    label: 'Create product',
    desc:  'New account or card type',
    Icon:  Package,
    color: 'bg-primary/10 text-primary',
  },
  {
    href:  '/superadmin/feature-flags',
    label: 'Toggle feature flag',
    desc:  'Control rollouts',
    Icon:  Flag,
    color: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
  },
  {
    href:  '/superadmin/users',
    label: 'Manage users',
    desc:  'KYC, suspend, 2FA',
    Icon:  Users,
    color: 'bg-success-muted text-success',
  },
  {
    href:  '/superadmin/audit-log',
    label: 'View audit log',
    desc:  'Full activity history',
    Icon:  ScrollText,
    color: 'bg-muted text-muted-foreground',
  },
  {
    href:  '/superadmin/system',
    label: 'System settings',
    desc:  'Config & maintenance',
    Icon:  Settings,
    color: 'bg-muted text-muted-foreground',
  },
] as const

// Service health widget
const SERVICES = [
  { name: 'Auth',        ok: true,  latency: '8ms'  },
  { name: 'Payments',    ok: true,  latency: '34ms' },
  { name: 'KYC',         ok: true,  latency: '89ms' },
  { name: 'FX feed',     ok: false, latency: '210ms' },
] as const

export function QuickActions() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 p-4 pt-0">
          {ACTIONS.map(({ href, label, desc, Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-2 rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/40 transition-all duration-150"
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium leading-tight group-hover:text-primary transition-colors">
                  {label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Service health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-0">
          {SERVICES.map(({ name, ok, latency }) => (
            <div key={name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  ok ? 'bg-emerald-500' : 'bg-amber-500',
                )} />
                <span className="text-sm">{name}</span>
              </div>
              <span className={cn(
                'font-mono text-xs',
                ok ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400 font-medium',
              )}>
                {latency}
              </span>
            </div>
          ))}
          <Separator className="my-1" />
          <p className="text-[11px] text-muted-foreground text-center">
            Last checked 12s ago
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
