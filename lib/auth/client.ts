// lib/auth/client.ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export async function requireClient(): Promise<User> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  const role = (user as User).app_metadata?.['role'] as string | undefined
  if (role === 'superadmin' || role === 'admin') redirect('/portal-select')
  return user as User
}

export async function requireAdmin(): Promise<User> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  const role = (user as User).app_metadata?.['role'] as string | undefined
  if (role !== 'admin' && role !== 'superadmin') redirect('/unauthorized')
  return user as User
}

/**
 * Returns the list of user IDs this admin may access.
 * Superadmins get 'all'. Admins get their assigned user IDs.
 * Returns empty array if admin has no assignments yet.
 */
export async function getAdminScope(adminUserId: string, role: string): Promise<string[] | 'all'> {
  if (role === 'superadmin') return 'all'

  // Use admin client to bypass RLS — this is a server-side auth helper,
  // the calling page already verified the user is an authenticated admin.
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  const { data, error } = await (supabase as any)
    .from('admin_assignments')
    .select('user_id')
    .eq('admin_id', adminUserId)

  if (error) {
    console.error('[getAdminScope] failed to fetch assignments:', error.message)
    return []
  }

  return (data ?? []).map((r: { user_id: string }) => r.user_id as string)
}
