// app/[locale]/(client)/layout.tsx
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientSidebar } from './_components/client-sidebar'
import { ClientTopbar } from './_components/client-topbar'

async function requireClient() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  // Redirect staff to their portals
  const role = user.app_metadata?.['role'] as string | undefined
  if (role === 'superadmin') redirect('/superadmin/dashboard')
  if (role === 'admin') redirect('/admin/dashboard')
  return user
}

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await requireClient()

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, kyc_status, account_status')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      <ClientSidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <ClientTopbar
          userEmail={user.email ?? ''}
          userName={profile?.full_name ?? ''}
          kycStatus={profile?.kyc_status ?? 'not_started'}
          userId={user.id}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
