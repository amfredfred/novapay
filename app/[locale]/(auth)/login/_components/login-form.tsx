// app/[locale]/(auth)/login/_components/login-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  redirectTo:   string
  serverError?: string | undefined
}

export function LoginForm({ redirectTo, serverError }: Props) {
  const router = useRouter()
  const [showPass, setShowPass]      = useState(false)
  const [authError, setAuthError]    = useState(serverError ?? '')
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  function onSubmit({ email, password }: FormValues) {
    setAuthError('')
    startTransition(async () => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setAuthError(error.message)
        return
      }

      const role = data.user?.app_metadata?.['role'] as string | undefined

      // Staff with multiple portals → let them choose
      if (role === 'superadmin' || role === 'admin') {
        router.push('/portal-select')
        router.refresh()
        return
      }

      // Regular clients → straight to their dashboard
      router.push(redirectTo.startsWith('/') ? redirectTo : '/dashboard')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {authError && (
        <div className="flex items-start gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {authError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1.5">
          Email address
        </label>
        <input
          {...register('email')}
          id="email"
          type="email"
          autoComplete="email"
          placeholder="alice@example.com"
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
        />
        {errors.email && (
          <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-foreground/80">
            Password
          </label>
          <a href="/forgot-password" className="text-xs text-primary hover:underline">
            Forgot password?
          </a>
        </div>
        <div className="relative">
          <input
            {...register('password')}
            id="password"
            type={showPass ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-3 py-2.5 pr-10 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 text-sm mt-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
