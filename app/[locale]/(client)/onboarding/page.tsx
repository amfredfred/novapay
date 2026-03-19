// app/[locale]/(client)/onboarding/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { OnboardingClient } from './onboarding-client'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await requireClient()
  const supabase = await createClient()

  // Check if user already has accounts — skip onboarding if so
  const { count } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) > 0) redirect('/dashboard')

  // Get available products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, type, supported_currencies, monthly_fee, fee_currency, description:name')
    .eq('is_active', true)
    .order('name')

  return (
    <OnboardingClient
      userId={user.id}
      products={products ?? []}
    />
  )
}
