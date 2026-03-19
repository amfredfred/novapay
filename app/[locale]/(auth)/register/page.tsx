// app/[locale]/(auth)/register/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { RegisterForm } from './_components/register-form'

export const metadata: Metadata = { title: 'Create account · NovaPay' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg">NovaPay</span>
        </div>
        <div>
          <blockquote className="text-2xl font-medium leading-relaxed mb-6">
            "I opened my account in 4 minutes and had my card delivered the next day. Best banking experience I've ever had."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">AS</div>
            <div>
              <p className="font-medium">Alice Schmidt</p>
              <p className="text-primary-foreground/70 text-sm">Freelance designer, Berlin</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 border-t border-white/20 pt-8">
          {[['50k+', 'customers'], ['€4.2B+', 'processed'], ['4.9★', 'App Store']].map(([v, l]) => (
            <div key={l}><div className="text-2xl font-bold">{v}</div><div className="text-primary-foreground/70 text-sm">{l}</div></div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-16">
        <div className="max-w-md w-full mx-auto">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">NovaPay</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
          <p className="text-muted-foreground text-sm mb-8">Free forever. No credit card required.</p>
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            By creating an account you agree to our{' '}
            <a href="#" className="underline">Terms</a> and{' '}
            <a href="#" className="underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
