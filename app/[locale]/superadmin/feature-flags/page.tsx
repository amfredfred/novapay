// app/[locale]/(superadmin)/feature-flags/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { FeatureFlagsClient } from './_components/feature-flags-client'

export const metadata: Metadata = { title: 'Feature Flags' }
export const dynamic = 'force-dynamic'

export default async function FeatureFlagsPage() {
  await requireSuperadmin()
  const supabase = await createClient()
  const { data: flags, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {(flags ?? []).filter((f) => f.enabled).length} of {(flags ?? []).length} flags enabled
        </p>
      </div>
      <FeatureFlagsClient initialFlags={flags ?? []} />
    </div>
  )
}
