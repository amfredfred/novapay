// app/[locale]/(admin)/_components/admin-sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ShieldCheck, Receipt, MessageSquare, HeadphonesIcon, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/admin/customers',    label: 'Customers',    Icon: Users },
  { href: '/admin/kyc-review',   label: 'KYC Review',   Icon: ShieldCheck },
  { href: '/admin/transactions', label: 'Transactions', Icon: Receipt },
  { href: '/admin/disputes',     label: 'Disputes',     Icon: MessageSquare },
  { href: '/admin/messages',     label: 'Messages',     Icon: HeadphonesIcon },
] as const

const CREATE_USER_NAV = { href: '/admin/create-user', label: 'Create User', Icon: UserPlus } as const

export function AdminSidebar({ canCreateUsers }: { canCreateUsers: boolean }) {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex w-[220px] flex-col shrink-0 border-r border-border bg-card overflow-y-auto">
      <div className="flex items-center gap-2.5 h-14 px-5 border-b border-border">
        <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center">
          <HeadphonesIcon className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-foreground">NovaPay</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70 mt-0.5">Admin portal</p>
        </div>
      </div>
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {[...NAV, ...(canCreateUsers ? [CREATE_USER_NAV] : [])].map(({ href, label, Icon }) => {
          const active = pathname.includes(href)
          return (
            <Link key={href} href={href} className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
              active ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}>
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-foreground/80' : 'text-muted-foreground/70')} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Link href="/superadmin/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50 transition-colors">
          ↗ Superadmin console
        </Link>
      </div>
    </aside>
  )
}
