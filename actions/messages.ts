'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { requireAdmin } from '@/lib/auth/client'
import { requireSuperadmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'

const SendSchema = z.object({
  receiverId: z.string().uuid(),
  body:       z.string().min(1).max(2000).trim(),
})

export async function sendMessage(values: z.infer<typeof SendSchema>): Promise<ActionResult<{ id: string }>> {
  const user   = await requireClient()
  const parsed = SendSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages' as any)
    .insert({ sender_id: user.id, receiver_id: parsed.data.receiverId, body: parsed.data.body })
    .select('id').single()

  if (error || !data) return { success: false, error: error?.message ?? 'Failed to send' }
  revalidatePath('/help')
  return { success: true, data: { id: (data as any).id } }
}

export async function sendMessageAsAdmin(values: z.infer<typeof SendSchema>): Promise<ActionResult<{ id: string }>> {
  const admin  = await requireAdmin()
  const parsed = SendSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('messages')
    .insert({ sender_id: admin.id, receiver_id: parsed.data.receiverId, body: parsed.data.body })
    .select('id').single()

  if (error || !data) return { success: false, error: error?.message ?? 'Failed to send' }
  return { success: true, data: { id: data.id } }
}

export async function sendMessageAsSuperadmin(values: z.infer<typeof SendSchema>): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireSuperadmin()
  const parsed   = SendSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('messages')
    .insert({ sender_id: user.id, receiver_id: parsed.data.receiverId, body: parsed.data.body })
    .select('id').single()

  if (error || !data) return { success: false, error: error?.message ?? 'Failed to send' }
  return { success: true, data: { id: data.id } }
}

export async function markThreadRead(otherUserId: string): Promise<void> {
  const user   = await requireClient()
  const supabase = await createClient()
  await (supabase as any)
    .from('messages')
    .update({ read: true })
    .eq('receiver_id', user.id)
    .eq('sender_id', otherUserId)
}

export async function markThreadReadAsAdmin(userId: string): Promise<void> {
  const admin  = await requireAdmin()
  const supabase = createAdminClient()
  await (supabase as any)
    .from('messages')
    .update({ read: true })
    .eq('receiver_id', admin.id)
    .eq('sender_id', userId)
}

/** Get thread between two users — used by client portal */
export async function getThread(otherUserId: string): Promise<any[]> {
  const user   = await requireClient()
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('messages')
    .select('id, sender_id, receiver_id, body, read, created_at')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })
    .limit(100)
  return data ?? []
}

/** Get all threads for an admin — list of unique conversations */
export async function getAdminThreads(): Promise<any[]> {
  const admin  = await requireAdmin()
  const supabase = createAdminClient()
  const { data } = await (supabase as any)
    .from('messages')
    .select('id, sender_id, receiver_id, body, read, created_at')
    .or(`sender_id.eq.${admin.id},receiver_id.eq.${admin.id}`)
    .order('created_at', { ascending: false })
    .limit(500)
  return data ?? []
}

/** Create user (admin feature — requires feature flag) */
export async function adminCreateUser(values: {
  email: string; fullName: string; password: string
}): Promise<ActionResult<{ userId: string }>> {
  const admin = await requireAdmin()

  // Check per-admin permission stored on profiles
  const supabase = createAdminClient()
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('can_create_users')
    .eq('id', admin.id)
    .single()
  if (!profile?.can_create_users) return { success: false, error: 'You have not been granted permission to create users. Ask a superadmin.' }

  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email:    values.email,
    password: values.password,
    email_confirm: true,
    user_metadata: { full_name: values.fullName },
  })
  if (error || !newUser.user) return { success: false, error: error?.message ?? 'Failed to create user' }

  // Assign to this admin
  await (supabase as any).from('admin_assignments').insert({
    admin_id:    admin.id,
    user_id:     newUser.user.id,
    assigned_by: admin.id,
  })

  return { success: true, data: { userId: newUser.user.id } }
}
