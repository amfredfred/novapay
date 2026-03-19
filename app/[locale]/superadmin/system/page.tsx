// app/[locale]/superadmin/system/page.tsx
import type { Metadata } from 'next'
import { requireSuperadmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { GlobalSettingsForm } from './_components/global-settings-form'
import { ServiceHealthGrid } from './_components/service-health-grid'
import { RealtimeLogFeed } from './_components/realtime-log-feed'

export const metadata: Metadata = { title: 'System · NovaPay Superadmin' }
export const dynamic = 'force-dynamic'

const DEFAULT_SETTINGS = {
  support_email:           'support@novapay.io',
  min_kyc_amount:          1000,
  max_login_attempts:      5,
  session_timeout_minutes: 60,
  default_currency:        'EUR' as const,
  maintenance_mode:        false,
  updated_at:              new Date().toISOString(),
  updated_by:              null,
}

async function getSettings() {
  const supabase = await createClient()
  // Use maybeSingle() — returns null when table is empty (fresh install)
  const { data } = await supabase
    .from('global_settings')
    .select('*')
    .maybeSingle()
  return (data ?? DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS & { id?: number }
}

export default async function SystemPage() {
  await requireSuperadmin()
  const settings = await getSettings()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">System</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform-wide configuration and service health
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-6">
          <GlobalSettingsForm settings={settings as Parameters<typeof GlobalSettingsForm>[0]['settings']} />
        </div>
        <div className="space-y-6">
          <ServiceHealthGrid />
          <RealtimeLogFeed />
        </div>
      </div>
    </div>
  )
}
