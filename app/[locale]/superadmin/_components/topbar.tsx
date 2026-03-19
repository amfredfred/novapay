// app/[locale]/(superadmin)/_components/topbar.tsx
'use client'

import { ChevronDown, Circle, Bell } from 'lucide-react'
import { NotificationsBell } from '@/components/notifications-bell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/lib/i18n/navigation'

interface Props {
  adminEmail: string
  adminId:   string
}

export function Topbar({ adminEmail, adminId }: Props) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background shrink-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Superadmin</span>
        <span>/</span>
        <span className="text-foreground font-medium" id="page-title">Dashboard</span>
      </div>

      <div className="flex items-center gap-3">
        {/* System health indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground
          border border-border rounded-full px-3 py-1.5">
          <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
          <span>All systems operational</span>
        </div>

        <NotificationsBell userId={adminId} />

        {/* Admin menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-8">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                {getInitials(adminEmail.split('@')[0] ?? 'SA')}
              </div>
              <span className="text-xs max-w-[140px] truncate hidden sm:block">{adminEmail}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium truncate">{adminEmail}</p>
              <p className="text-[10px] text-primary font-medium uppercase tracking-wide mt-0.5">
                Superadmin
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile settings</DropdownMenuItem>
            <DropdownMenuItem>API keys</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
