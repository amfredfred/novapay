// app/[locale]/(auth)/portal-select/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard, ShieldCheck, HeadphonesIcon,
  CreditCard, ArrowRight, LogOut,
} from 'lucide-react'
import Link from 'next/link'

export default async function PortalSelectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → back to login
  if (!user) redirect('/login')

  const role = user.app_metadata?.['role'] as string | undefined

  // Regular users go straight to their dashboard — no choice needed
  if (!role || (role !== 'admin' && role !== 'superadmin')) {
    redirect('/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const name = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there'

  const portals = [
    ...(role === 'superadmin' ? [{
      href:    '/superadmin/dashboard',
      label:   'Superadmin console',
      sub:     'Platform engineering, feature flags, audit logs',
      Icon:    ShieldCheck,
      color:   'from-slate-800 to-slate-900',
      badge:   'Superadmin',
      badgeColor: 'bg-red-500/20 text-red-300',
    }] : []),
    {
      href:    '/admin/dashboard',
      label:   'Admin portal',
      sub:     'Customer support, KYC review, disputes',
      Icon:    HeadphonesIcon,
      color:   'from-primary to-primary/80',
      badge:   'Admin',
      badgeColor: 'bg-blue-400/20 text-primary-foreground/70',
    },
    {
      href:    '/dashboard',
      label:   'My banking app',
      sub:     'Your personal NovaPay account',
      Icon:    CreditCard,
      color:   'from-emerald-600 to-emerald-800',
      badge:   'Personal',
      badgeColor: 'bg-emerald-400/20 text-emerald-200',
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-foreground">NovaPay</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Welcome back, {name} 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          You have access to multiple portals. Where would you like to go?
        </p>
      </div>

      {/* Portal cards */}
      <div className="w-full max-w-xl space-y-3">
        {portals.map(({ href, label, sub, Icon, color, badge, badgeColor }) => (
          <Link
            key={href}
            href={href}
            className={`group flex items-center gap-5 bg-gradient-to-r ${color} rounded-2xl p-5 text-white hover:scale-[1.01] hover:shadow-xl transition-all duration-150`}
          >
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors">
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-base">{label}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {badge}
                </span>
              </div>
              <p className="text-sm text-white/70">{sub}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <form
        className="mt-8"
        action={async () => {
          'use server'
          const s = await createClient()
          await s.auth.signOut()
          redirect('/login')
        }}
      >
        <button
          type="submit"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-muted-foreground transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </form>
    </div>
  )
}
