'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Landmark, CreditCard, ArrowLeftRight, ArrowDownLeft,
  RefreshCw, Receipt, Settings, ShieldCheck, HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',      label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/accounts',       label: 'Accounts',     Icon: Landmark },
  { href: '/cards',          label: 'Cards',        Icon: CreditCard },
  { href: '/transfer',       label: 'Send money',   Icon: ArrowLeftRight },
  { href: '/receive',        label: 'Receive',      Icon: ArrowDownLeft },
  { href: '/exchange',       label: 'Exchange',     Icon: RefreshCw },
  { href: '/transactions',   label: 'Transactions', Icon: Receipt },
] as const

const BOTTOM_NAV = [
  { href: '/kyc',      label: 'Verification', Icon: ShieldCheck },
  { href: '/settings', label: 'Settings',     Icon: Settings },
  { href: '/help',     label: 'Help',         Icon: HelpCircle },
] as const

export function ClientSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname.endsWith('/dashboard')
    return pathname.includes(href)
  }

  return (
    <aside className="hidden md:flex w-[220px] flex-col shrink-0 border-r border-border bg-card overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-border">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground tracking-tight">NovaPay</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-border py-3 px-3 space-y-0.5">
        {BOTTOM_NAV.map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
              {label}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
