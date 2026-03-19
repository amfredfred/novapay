// lib/auth/index.ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { Json } from '@/types/supabase'

export async function requireSuperadmin(): Promise<{ user: User }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  const role = (user as User).app_metadata?.['role'] as string | undefined
  if (role !== 'superadmin') redirect('/unauthorized')
  return { user: user as User }
}

export async function writeAuditLog(params: {
  actorId:    string
  actorEmail: string
  action:     string
  targetType: 'user' | 'transaction' | 'product' | 'flag' | 'settings' | 'account'
  targetId:   string
  diff?:      Record<string, unknown> | undefined
  ip?:        string | undefined
}) {
  try {
    const supabase = await createClient()
    await supabase.from('audit_log').insert({
      actor_id:    params.actorId,
      actor_email: params.actorEmail,
      action:      params.action,
      target_type: params.targetType,
      target_id:   params.targetId,
      diff:        params.diff !== undefined ? (params.diff as unknown as Json) : null,
      ip:          params.ip !== undefined ? params.ip : null,
    })
  } catch (err) {
    console.error('[writeAuditLog]', err)
  }
}
