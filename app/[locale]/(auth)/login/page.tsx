// app/[locale]/(auth)/login/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from './_components/login-form'
import { LogoMark } from '@/components/logo'

export const metadata: Metadata = { title: 'Sign in · NovaPay' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <LogoMark size={36} className="rounded-xl" />
          <span className="font-semibold text-lg text-foreground">NovaPay</span>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
          </div>

          <LoginForm
            redirectTo={next ?? '/dashboard'}
            serverError={error as string | undefined}
          />

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Create one free
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
