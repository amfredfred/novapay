// app/[locale]/(client)/settings/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { ProfileForm } from './_components/profile-form'
import { SecuritySection } from './_components/security-section'

export const metadata: Metadata = { title: 'Settings · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireClient()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tx_pin_hash')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your profile and account preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Personal information</h2>
        </div>
        <div className="p-5">
          <ProfileForm profile={profile ?? {
            id: user.id, email: user.email ?? '',
            full_name: null, phone: null, date_of_birth: null,
            nationality: null, country_of_residence: null,
          }} />
        </div>
      </div>

      {/* Security */}
      <SecuritySection
        twoFaEnabled={profile?.two_fa_enabled ?? false}
        lastLogin={profile?.last_login_at ?? null}
        hasPinSet={!!(profile as any)?.tx_pin_hash}
      />

      {/* Notifications */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Notifications</h2>
          <p className="text-xs text-muted-foreground mt-0.5">In-app notifications are always on. Toggle email preferences below.</p>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: 'Transaction alerts',   desc: 'Notification for every transaction',       on: true },
            { label: 'Large payment alerts', desc: 'Payments exceeding €500',                  on: true },
            { label: 'Fraud alerts',         desc: 'Immediate alert on suspicious activity',   on: true },
            { label: 'Weekly summary',       desc: 'Spending report every Monday',              on: false },
            { label: 'Marketing emails',     desc: 'Product updates and offers from NovaPay',  on: false },
          ].map(({ label, desc, on }) => (
            <div key={label} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <label className="relative w-10 h-6 shrink-0 ml-4 cursor-pointer">
                <input type="checkbox" defaultChecked={on} className="sr-only peer" />
                <div className="w-10 h-6 bg-muted/80 rounded-full peer peer-checked:bg-primary transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Danger */}
      <div className="bg-card rounded-2xl border border-destructive/20 overflow-hidden">
        <div className="p-5 border-b border-destructive/10">
          <h2 className="font-semibold text-destructive">Danger zone</h2>
        </div>
        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Close account</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permanently close your NovaPay account and withdraw remaining funds</p>
          </div>
          <button className="text-sm font-medium text-destructive border border-destructive/30 px-4 py-2 rounded-xl hover:bg-destructive/10 transition-colors shrink-0 ml-4">
            Close account
          </button>
        </div>
      </div>
    </div>
  )
}
