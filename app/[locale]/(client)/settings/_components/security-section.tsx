// app/[locale]/(client)/settings/_components/security-section.tsx
'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, ShieldCheck, LogOut, Smartphone, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { setTxPin } from '@/actions/client'

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword:     z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
})

type PwValues = z.infer<typeof pwSchema>

function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const [showPw, setShowPw]    = useState(false)
  const [isPending, start]     = useTransition()
  const { register, handleSubmit, formState: { errors } } = useForm<PwValues>({
    resolver: zodResolver(pwSchema),
  })

  function onSubmit({ newPassword }: PwValues) {
    start(async () => {
      try {
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) { toast.error('Failed to change password', { description: error.message }); return }
        toast.success('Password changed successfully')
        onClose()
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  const cls = 'w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3 pt-4 border-t border-border">
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Current password</label>
        <div className="relative">
          <input {...register('currentPassword')} type={showPw ? 'text' : 'password'} className={`${cls} pr-10`} />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.currentPassword && <p className="text-xs text-red-600 mt-1">{errors.currentPassword.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">New password</label>
        <input {...register('newPassword')} type="password" className={cls} />
        {errors.newPassword && <p className="text-xs text-red-600 mt-1">{errors.newPassword.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Confirm new password</label>
        <input {...register('confirmPassword')} type="password" className={cls} />
        {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2 border border-border rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted/50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-2 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Update password'}
        </button>
      </div>
    </form>
  )
}

function TxPinForm({ hasPinSet, onClose }: { hasPinSet: boolean; onClose: () => void }) {
  const [pin, setPin]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [isPending, start]    = useTransition()

  const inputCls = 'w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors'

  function handleSet() {
    if (!/^\d{4,6}$/.test(pin)) { toast.error('PIN must be 4–6 digits'); return }
    if (pin !== confirm) { toast.error('PINs do not match'); return }
    start(async () => {
      try {
        const result = await setTxPin(pin)
        if (!result?.success) { toast.error(result?.error); return }
        toast.success('Transaction PIN set')
        onClose()
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="mt-4 space-y-3 pt-4 border-t border-border">
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">New PIN (4–6 digits)</label>
        <input type="password" inputMode="numeric" maxLength={6} value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g,''))}
          placeholder="••••" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Confirm PIN</label>
        <input type="password" inputMode="numeric" maxLength={6} value={confirm}
          onChange={e => setConfirm(e.target.value.replace(/\D/g,''))}
          placeholder="••••" className={inputCls} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors">Cancel</button>
        <button type="button" onClick={handleSet} disabled={isPending || pin.length < 4}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {hasPinSet ? 'Update PIN' : 'Set PIN'}
        </button>
      </div>
    </div>
  )
}

interface Props {
  twoFaEnabled: boolean
  lastLogin:    string | null
  hasPinSet:    boolean
}

export function SecuritySection({ twoFaEnabled, lastLogin, hasPinSet }: Props) {
  const [showPwForm, setShowPwForm]   = useState(false)
  const [showPinForm, setShowPinForm] = useState(false)
  const [signingOut, startSignOut]    = useTransition()

  function signOutAllDevices() {
    startSignOut(async () => {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'global' })
      toast.success('Signed out from all devices')
      window.location.href = '/login'
    })
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="font-semibold text-foreground">Security</h2>
      </div>
      <div className="divide-y divide-border">

        {/* Password */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lastLogin ? `Last login: ${new Date(lastLogin).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Use a strong, unique password'}
              </p>
            </div>
            <button onClick={() => setShowPwForm(v => !v)}
              className="text-sm font-medium text-primary hover:text-blue-700 transition-colors">
              {showPwForm ? 'Cancel' : 'Change'}
            </button>
          </div>
          {showPwForm && <ChangePasswordForm onClose={() => setShowPwForm(false)} />}
        </div>

        {/* 2FA */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${twoFaEnabled ? 'bg-green-500/10' : 'bg-muted'}`}>
              <ShieldCheck className={`h-4 w-4 ${twoFaEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {twoFaEnabled ? 'Enabled via authenticator app' : 'Strongly recommended for your account security'}
              </p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${twoFaEnabled ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
            {twoFaEnabled ? 'Enabled' : 'Not set up'}
          </span>
        </div>

        {/* Transaction PIN */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${hasPinSet ? 'bg-green-500/10' : 'bg-muted'}`}>
                <KeyRound className={`h-4 w-4 ${hasPinSet ? 'text-green-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Transaction PIN</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasPinSet ? 'Required before sending money or exchanging' : 'Set a PIN to confirm payments'}
                </p>
              </div>
            </div>
            <button onClick={() => setShowPinForm(v => !v)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              {showPinForm ? 'Cancel' : hasPinSet ? 'Change' : 'Set PIN'}
            </button>
          </div>
          {showPinForm && <TxPinForm hasPinSet={hasPinSet} onClose={() => setShowPinForm(false)} />}
        </div>

        {/* Sessions */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Active sessions</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sign out all other devices</p>
            </div>
          </div>
          <button onClick={signOutAllDevices} disabled={signingOut}
            className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors disabled:opacity-50">
            {signingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            Sign out all
          </button>
        </div>

      </div>
    </div>
  )
}
