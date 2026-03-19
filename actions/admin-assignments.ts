// actions/admin-assignments.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import type { ActionResult } from '@/types'

const AssignSchema = z.object({
  adminId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1),
})

export async function assignUsersToAdmin(
  values: z.infer<typeof AssignSchema>,
): Promise<ActionResult> {
  const { user } = await requireSuperadmin()
  const parsed = AssignSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const rows = parsed.data.userIds.map(userId => ({
    admin_id:    parsed.data.adminId,
    user_id:     userId,
    assigned_by: user.id,
  }))

  const { error } = await supabaseAny
    .from('admin_assignments')
    .upsert(rows, { onConflict: 'admin_id,user_id', ignoreDuplicates: true })

  if (error) return { success: false, error: error.message }
  revalidatePath('/superadmin/users')
  revalidatePath('/superadmin/assignments')
  return { success: true, data: undefined }
}

export async function unassignUserFromAdmin(
  adminId: string,
  userId: string,
): Promise<ActionResult> {
  await requireSuperadmin()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('admin_assignments')
    .delete()
    .eq('admin_id', adminId)
    .eq('user_id', userId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/superadmin/users')
  revalidatePath('/superadmin/assignments')
  return { success: true, data: undefined }
}

/** Gets the user IDs assigned to a given admin (used in admin portal to filter views) */
export async function getAssignedUserIds(adminId: string): Promise<string[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('admin_assignments')
    .select('user_id')
    .eq('admin_id', adminId)
  return (data ?? []).map((r: { user_id: string }) => r.user_id)
}

/** Promote a regular user to admin role */
export async function promoteToAdmin(userId: string): Promise<ActionResult> {
  await requireSuperadmin()

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = createAdminClient()

  // Update auth.users app_metadata via admin API — guaranteed to work
  const { error: authErr } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'admin' },
  })
  if (authErr) return { success: false, error: authErr.message }

  // Sync role_hint in profiles for UI display
  const { error: profileErr } = await (adminClient as any)
    .from('profiles')
    .update({ role_hint: 'admin' })
    .eq('id', userId)
  if (profileErr) return { success: false, error: profileErr.message }

  revalidatePath('/superadmin/assignments')
  revalidatePath('/superadmin/users')
  return { success: true, data: undefined }
}

/** Demote an admin back to regular client role */
export async function demoteFromAdmin(userId: string): Promise<ActionResult> {
  await requireSuperadmin()
  const supabase = await createClient()

  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = createAdminClient()

  const { error: authErr } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'client' },
  })
  if (authErr) return { success: false, error: authErr.message }

  await supabase.from('profiles').update({ role_hint: 'client' } as never).eq('id', userId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('admin_assignments').delete().eq('admin_id', userId)

  revalidatePath('/superadmin/assignments')
  revalidatePath('/superadmin/users')
  return { success: true, data: undefined }
}

/** Look up a user by exact email — returns minimal info for confirmation before promoting */
export async function lookupUserByEmail(
  email: string,
): Promise<ActionResult<{ id: string; name: string; email: string; role_hint: string }>> {
  await requireSuperadmin()
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('id, full_name, email, role_hint')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (error || !data) return { success: false, error: 'No user found with that email' }
  if (data.role_hint === 'admin') return { success: false, error: 'User is already an admin' }
  if (data.role_hint === 'superadmin') return { success: false, error: 'Cannot modify a superadmin' }

  return {
    success: true,
    data: {
      id:        data.id,
      name:      data.full_name ?? data.email,
      email:     data.email,
      role_hint: data.role_hint,
    },
  }
}

/** Toggle can_create_users permission for a specific admin */
export async function setAdminCanCreate(
  adminId: string,
  canCreate: boolean,
): Promise<ActionResult> {
  await requireSuperadmin()
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  // Update all assignment rows for this admin (same value across all)
  const { error } = await (supabase as any)
    .from('admin_assignments')
    .update({ can_create_users: canCreate })
    .eq('admin_id', adminId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/superadmin/assignments')
  return { success: true, data: undefined }
}

/** Toggle the can_create_users permission for a specific admin.
 *  Stores permission on profiles.role_hint is too blunt — we use a dedicated
 *  admin_permissions table or fall back to upsert on a sentinel assignment row.
 *  Since admin_assignments requires a real user_id FK, we store this on profiles directly.
 */
export async function toggleAdminCanCreateUsers(
  adminId: string,
  val: boolean,
): Promise<ActionResult> {
  await requireSuperadmin()
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  // Store on profiles as a metadata field — no FK constraint issues
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ can_create_users: val })
    .eq('id', adminId)

  if (error) return { success: false, error: error.message }

  // Also update any existing assignment rows for consistency
  await (supabase as any)
    .from('admin_assignments')
    .update({ can_create_users: val })
    .eq('admin_id', adminId)

  revalidatePath('/superadmin/assignments')
  return { success: true, data: undefined }
}
