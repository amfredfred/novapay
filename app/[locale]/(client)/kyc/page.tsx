// app/[locale]/(client)/kyc/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { KycClient } from './kyc-client'

export const metadata: Metadata = { title: 'Verification · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function KycPage() {
  const user = await requireClient()
  const supabase = await createClient()

  const [{ data: profile }, { data: rawDocs }] = await Promise.all([
    supabase.from('profiles').select('kyc_status, full_name').eq('id', user.id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('kyc_documents').select('doc_type, status').eq('user_id', user.id),
  ])

  const submittedTypes = new Set(
    ((rawDocs ?? []) as Array<{ doc_type: string; status: string }>).map(d => d.doc_type)
  )

  return (
    <KycClient
      userId={user.id}
      kycStatus={profile?.kyc_status ?? 'not_started'}
      submittedTypes={[...submittedTypes]}
    />
  )
}
