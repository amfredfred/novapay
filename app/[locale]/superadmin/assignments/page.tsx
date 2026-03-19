// app/[locale]/superadmin/assignments/page.tsx
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { AssignmentsClient } from './_components/assignments-client'

export const metadata: Metadata = { title: 'User Assignments · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function AssignmentsPage() {
  await requireSuperadmin()
  // Use admin client for all reads to guarantee no RLS gaps
  const admin = createAdminClient()

  const [
    { data: rawAssignments },
    { data: allProfiles },
  ] = await Promise.all([
    (admin as any).from('admin_assignments').select('admin_id, user_id, can_create_users'),
    (admin as any)
      .from('profiles')
      .select('id, full_name, email, kyc_status, account_status, role_hint, can_create_users')
      .order('full_name')
      .limit(1000),
  ])

  const profiles = (allProfiles ?? []) as Array<{
    id: string
    full_name: string | null
    email: string
    kyc_status: string
    account_status: string
    role_hint: string
  }>

  // Drive admin list purely from role_hint — no fragile RPC needed
  const admins = profiles.filter(p => p.role_hint === 'admin')
  const adminIds = new Set(admins.map(a => a.id))

  // Build assignment map from DB — source of truth
  const assignmentMap: Record<string, string[]> = {}
  const canCreateMap: Record<string, boolean> = {}
  for (const a of (rawAssignments ?? []) as Array<{ admin_id: string; user_id: string; can_create_users: boolean }>) {
    if (!assignmentMap[a.admin_id]) assignmentMap[a.admin_id] = []
    assignmentMap[a.admin_id]!.push(a.user_id)
    // can_create_users is per admin_id (same value across all rows for that admin)
    if (a.can_create_users) canCreateMap[a.admin_id] = true
  }

  // All user IDs that appear anywhere in admin_assignments as a user_id (assigned users)
  const assignedUserIds = new Set(
    (rawAssignments ?? []).map((a: { user_id: string }) => a.user_id)
  )

  // Clients = profiles that are NOT admins and NOT superadmins
  // Use role_hint as primary signal; also exclude anyone in adminIds
  const clients = profiles
    .filter((p) => !adminIds.has(p.id) && p.role_hint !== 'admin' && p.role_hint !== 'superadmin')
    .map((c) => ({
      id: c.id,
      name: c.full_name ?? c.email ?? c.id,
      email: c.email ?? '',
      kyc: c.kyc_status,
      status: c.account_status,
    }))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Promote users to admin, then assign customers to each admin agent.
        </p>
      </div>
      <AssignmentsClient
        admins={admins.map(
          (a) => ({ id: a.id, name: a.full_name ?? a.email ?? a.id, email: a.email ?? '', canCreateUsers: (a as any).can_create_users ?? false }),
        )}
        clients={clients}
        initialAssignments={assignmentMap}
        canCreateMap={canCreateMap}
      />
    </div>
  )
}
