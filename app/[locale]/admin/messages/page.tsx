// app/[locale]/(admin)/messages/page.tsx
import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/client'
import { createAdminClient } from '@/lib/supabase/server'
import { AdminMessagesClient } from './_components/admin-messages-client'

export const metadata: Metadata = { title: 'Messages · Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminMessagesPage() {
  const admin    = await requireAdmin()
  const supabase = createAdminClient()

  // All messages in/out for this admin
  const { data: allMessages } = await (supabase as any)
    .from('messages')
    .select('id, sender_id, receiver_id, body, read, created_at')
    .or(`sender_id.eq.${admin.id},receiver_id.eq.${admin.id}`)
    .order('created_at', { ascending: true })
    .limit(1000)

  // Unique user IDs this admin talks to
  const msgs = (allMessages ?? []) as any[]
  const userIds = [...new Set(msgs.map((m: any) =>
    m.sender_id === admin.id ? m.receiver_id : m.sender_id
  ))] as string[]

  // Fetch profiles for those users
  const { data: profiles } = userIds.length > 0
    ? await (supabase as any).from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] }

  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))

  // Group messages into threads
  const threads = userIds.map(uid => ({
    userId:   uid,
    name:     (profileMap[uid] as any)?.full_name ?? (profileMap[uid] as any)?.email ?? uid,
    email:    (profileMap[uid] as any)?.email ?? '',
    messages: msgs.filter((m: any) => m.sender_id === uid || m.receiver_id === uid),
    unread:   msgs.filter((m: any) => m.sender_id === uid && !m.read).length,
  })).sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.created_at ?? ''
    const bLast = b.messages[b.messages.length - 1]?.created_at ?? ''
    return bLast.localeCompare(aLast)
  })

  return (
    <AdminMessagesClient
      adminId={admin.id}
      threads={threads}
    />
  )
}
