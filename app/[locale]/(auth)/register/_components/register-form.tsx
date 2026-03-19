// app/[locale]/(auth)/register/_components/register-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  fullName:  z.string().min(2, 'Enter your full name'),
  email:     z.string().email('Enter a valid email address'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  country:   z.string().min(2, 'Select your country'),
})

type FormValues = z.infer<typeof schema>

const COUNTRIES = [
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' }, { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' }, { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' },
  { code: 'NG', name: 'Nigeria' }, { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
]

export function RegisterForm() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [isPending, start]      = useTransition()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function onSubmit({ fullName, email, password, country }: FormValues) {
    setError('')
    start(async () => {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, country_of_residence: country },
        },
      })
      if (signUpError) { setError(signUpError.message); return }
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    })
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">Account created!</h3>
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1.5">Full name</label>
        <input
          {...register('fullName')}
          placeholder="Alice Schmidt"
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
        />
        {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1.5">Email address</label>
        <input
          {...register('email')}
          type="email"
          placeholder="alice@example.com"
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
        />
        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1.5">Password</label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPass ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1.5">Country of residence</label>
        <select
          {...register('country')}
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors bg-card appearance-none cursor-pointer"
        >
          <option value="">Select country…</option>
          {COUNTRIES.map(({ code, name }) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
        {errors.country && <p className="text-xs text-red-600 mt-1">{errors.country.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 text-sm mt-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isPending ? 'Creating account…' : 'Create free account'}
      </button>
    </form>
  )
}
