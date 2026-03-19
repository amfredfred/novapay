// app/[locale]/(admin)/_components/admin-topbar.tsx
'use client'

import { useRouter } from '@/lib/i18n/navigation'
import { LogOut } from 'lucide-react'
import { NotificationsBell } from '@/components/notifications-bell'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'

export function AdminTopbar({ adminEmail, adminId }: { adminEmail: string; adminId: string }) {
  const router = useRouter()
  async function signOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
      <p className="text-sm text-muted-foreground">Admin portal</p>
      <div className="flex items-center gap-3">
        <NotificationsBell userId={adminId} />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold">
            {getInitials(adminEmail.split('@')[0] ?? 'A')}
          </div>
          <span className="text-sm text-muted-foreground hidden sm:block">{adminEmail}</span>
        </div>
        <button onClick={signOut} className="p-2 text-muted-foreground/70 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
