import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/client'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreateUserForm } from './_components/create-user-form'

export const metadata: Metadata = { title: 'Create User · Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminCreateUserPage() {
  const admin   = await requireAdmin()
  const supabase = createAdminClient()

  // Check permission from profiles
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('can_create_users')
    .eq('id', admin.id)
    .single()

  if (!profile?.can_create_users) {
    redirect('/admin/dashboard')
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Create new user</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          New user will be automatically assigned to your account
        </p>
      </div>
      <CreateUserForm />
    </div>
  )
}
