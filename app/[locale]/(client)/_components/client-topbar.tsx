'use client'

import { useRouter } from '@/lib/i18n/navigation'
import { AlertCircle, LogOut, ChevronDown } from 'lucide-react'
import { NotificationsBell } from '@/components/notifications-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'

interface Props {
  userEmail:  string
  userName:   string
  kycStatus:  string
  userId:     string
}

export function ClientTopbar({ userEmail, userName, kycStatus, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials   = getInitials((userName || userEmail.split('@')[0]) ?? 'U')
  const kycPending = kycStatus === 'not_started' || kycStatus === 'pending'

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* KYC alert */}
      {kycPending ? (
        <Link
          href="/kyc"
          className="hidden sm:flex items-center gap-2 text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-full hover:bg-amber-500/20 transition-colors"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Complete identity verification to unlock all features
        </Link>
      ) : <div />}

      <div className="flex items-center gap-2">
        <ThemeToggle compact />

        <NotificationsBell userId={userId} />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
            <span className="text-sm text-foreground hidden sm:block max-w-[120px] truncate">
              {userName || userEmail}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-medium text-foreground truncate">{userName || 'Account'}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  Settings
                </Link>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
