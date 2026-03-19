// app/[locale]/superadmin/users/[userId]/_components/admin-assign-panel.tsx
import { createAdminClient } from '@/lib/supabase/server'
import { AdminAssignClient } from './admin-assign-client'

interface Admin {
  id:        string
  email:     string
  full_name: string | null
}

export async function AdminAssignPanel({ userId }: { userId: string }) {
  const supabase = createAdminClient()

  // Use role_hint — same source of truth as assignments page
  const [{ data: adminProfiles }, { data: assignments }] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('id, email, full_name')
      .eq('role_hint', 'admin')
      .eq('account_status', 'active'),
    (supabase as any)
      .from('admin_assignments')
      .select('admin_id')
      .eq('user_id', userId),
  ])

  const assignedAdminIds = new Set(
    ((assignments ?? []) as Array<{ admin_id: string }>).map(a => a.admin_id),
  )

  const admins = ((adminProfiles ?? []) as Admin[]).filter(a => a.id !== userId)

  return (
    <AdminAssignClient
      userId={userId}
      admins={admins}
      assignedAdminIds={[...assignedAdminIds]}
    />
  )
}
