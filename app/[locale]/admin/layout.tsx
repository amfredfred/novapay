// app/[locale]/(admin)/layout.tsx
import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/auth/client'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminSidebar } from './_components/admin-sidebar'
import { AdminTopbar } from './_components/admin-topbar'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user    = await requireAdmin()
  const supabase = createAdminClient()
  const { data: profile } = await (supabase as any)
    .from('profiles').select('can_create_users').eq('id', user.id).single()
  const canCreateUsers = profile?.can_create_users ?? false

  return (
    <div className="superadmin-shell dark flex h-screen overflow-hidden bg-background">
      <AdminSidebar canCreateUsers={canCreateUsers} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <AdminTopbar adminEmail={user.email ?? ''} adminId={user.id} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
