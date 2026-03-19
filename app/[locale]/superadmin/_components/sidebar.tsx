// app/[locale]/(superadmin)/_components/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Package, Sliders, Flag,
  ScrollText, Zap, Settings, ShieldCheck, ChevronRight,
  Globe, ArrowDownToLine, UserCheck, Send, MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/superadmin/dashboard',         label: 'Dashboard',          Icon: LayoutDashboard },
  { href: '/superadmin/users',             label: 'Users',              Icon: Users },
  { href: '/superadmin/kyc-review',        label: 'KYC Review',         Icon: ShieldCheck },
  { href: '/superadmin/products',          label: 'Products',           Icon: Package },
  { href: '/superadmin/fees-limits',       label: 'Fees & Limits',      Icon: Sliders },
  { href: '/superadmin/feature-flags',     label: 'Feature Flags',      Icon: Flag },
  { href: '/superadmin/deposits',          label: 'Deposits',           Icon: ArrowDownToLine },
  { href: '/superadmin/gateways',          label: 'Gateways',           Icon: Globe },
  { href: '/superadmin/audit-log',         label: 'Audit Log',          Icon: ScrollText },
  { href: '/superadmin/history-generator', label: 'History Generator',  Icon: Zap },
  { href: '/superadmin/assignments',       label: 'User Assignments',    Icon: UserCheck },
  { href: '/superadmin/transfer-methods',  label: 'Transfer Methods',   Icon: Send },
  { href: '/superadmin/messages',          label: 'Messages',           Icon: MessageCircle },
  { href: '/superadmin/system',            label: 'System',             Icon: Settings },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-[220px] flex-col shrink-0 border-r border-border bg-background overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-border">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
          <ShieldCheck className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none tracking-tight">NovaPay</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mt-0.5">
            Superadmin
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.includes(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
              <span className="flex-1 truncate">{label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary/60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <p className="text-[10px] text-center text-muted-foreground font-mono">
          NovaPay v2.0.0 · 2026
        </p>
      </div>
    </aside>
  )
}
