// app/[locale]/(client)/help/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { HelpClient } from './help-client'

export const metadata: Metadata = { title: 'Help & Support · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function HelpPage() {
  const user     = await requireClient()
  const supabase = createAdminClient()

  // Find this user's assigned admin (account manager)
  const { data: assignment } = await (supabase as any)
    .from('admin_assignments')
    .select('admin_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  let accountManager: { id: string; name: string; email: string } | null = null
  if (assignment?.admin_id) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', assignment.admin_id)
      .single()
    if (profile) {
      accountManager = { id: profile.id, name: profile.full_name ?? profile.email, email: profile.email }
    }
  }

  // Load existing thread if account manager exists
  let thread: any[] = []
  if (accountManager) {
    const { data } = await (supabase as any)
      .from('messages')
      .select('id, sender_id, receiver_id, body, read, created_at')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${accountManager.id}),and(sender_id.eq.${accountManager.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(100)
    thread = data ?? []
  }

  return (
    <HelpClient
      userId={user.id}
      accountManager={accountManager}
      initialThread={thread}
    />
  )
}
