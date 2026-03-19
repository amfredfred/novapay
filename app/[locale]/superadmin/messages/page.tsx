import type { Metadata } from 'next'
import { requireSuperadmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { SuperadminMessagesClient } from './_components/superadmin-messages-client'

export const metadata: Metadata = { title: 'Messages · Superadmin' }
export const dynamic = 'force-dynamic'

export default async function SuperadminMessagesPage() {
  const { user }  = await requireSuperadmin()
  const supabase  = createAdminClient()

  // All messages in the system
  const { data: allMessages } = await (supabase as any)
    .from('messages')
    .select('id, sender_id, receiver_id, body, read, created_at')
    .order('created_at', { ascending: true })
    .limit(2000)

  const msgs = (allMessages ?? []) as any[]

  // All unique participant pairs
  const pairSet = new Set<string>()
  const pairs: [string, string][] = []
  for (const m of msgs) {
    const key = [m.sender_id, m.receiver_id].sort().join('|')
    if (!pairSet.has(key)) { pairSet.add(key); pairs.push([m.sender_id, m.receiver_id]) }
  }

  // Fetch all involved profiles
  const allUserIds = [...new Set(msgs.flatMap((m: any) => [m.sender_id, m.receiver_id]))] as string[]
  const { data: profiles } = allUserIds.length > 0
    ? await (supabase as any).from('profiles').select('id, full_name, email, role_hint').in('id', allUserIds)
    : { data: [] }
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))

  const threads = pairs.map(([a, b]) => {
    const thread = msgs.filter((m: any) =>
      (m.sender_id === a && m.receiver_id === b) || (m.sender_id === b && m.receiver_id === a)
    )
    const pa = profileMap[a] as any
    const pb = profileMap[b] as any
    return {
      key: [a,b].sort().join('|'),
      userA: { id: a, name: pa?.full_name ?? pa?.email ?? a, email: pa?.email ?? '', role: pa?.role_hint ?? 'client' },
      userB: { id: b, name: pb?.full_name ?? pb?.email ?? b, email: pb?.email ?? '', role: pb?.role_hint ?? 'client' },
      messages: thread,
      lastAt: thread[thread.length - 1]?.created_at ?? '',
    }
  }).sort((a, b) => b.lastAt.localeCompare(a.lastAt))

  return (
    <SuperadminMessagesClient
      superadminId={user.id}
      threads={threads}
    />
  )
}
