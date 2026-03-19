// app/[locale]/(landing)/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  ShieldCheck, Zap, Globe, TrendingUp, CreditCard,
  ArrowRight, Star, CheckCircle, Lock, Smartphone,
} from 'lucide-react'

// Redirect if already logged in
export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const role = user.app_metadata?.['role'] as string | undefined
    if (role === 'superadmin') redirect('/superadmin/dashboard')
    if (role === 'admin') redirect('/admin/dashboard')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-card">
      {/* Nav */}
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">NovaPay</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#security" className="hover:text-foreground transition-colors">Security</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8 border border-blue-100">
          <Star className="w-3.5 h-3.5" />
          Trusted by 50,000+ customers across Europe
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6 max-w-3xl mx-auto">
          Banking built for the
          <span className="text-primary"> modern world</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Multi-currency accounts, instant transfers, smart cards, and real-time analytics.
          Open your account in minutes — no paperwork, no branches.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-colors text-base"
          >
            Open free account <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 border border-border text-foreground/80 font-medium px-8 py-3.5 rounded-xl hover:bg-background transition-colors text-base"
          >
            Sign in to existing account
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">No credit card required · FSCS protected up to £85,000</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 pt-12 border-t border-border">
          {[
            { value: '€4.2B+', label: 'Processed monthly' },
            { value: '50k+', label: 'Active users' },
            { value: '8', label: 'Currencies supported' },
            { value: '99.9%', label: 'Uptime SLA' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold text-foreground tracking-tight">{value}</div>
              <div className="text-sm text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-background py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Everything you need in one account</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From instant payments to multi-currency FX — built for people who move fast.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                Icon: Globe, color: 'bg-blue-100 text-primary',
                title: 'Multi-currency accounts',
                desc: 'Hold, send and receive in EUR, USD, GBP, CHF, JPY and more. Real exchange rates, always.',
              },
              {
                Icon: Zap, color: 'bg-amber-500/10 text-amber-600',
                title: 'Instant SEPA transfers',
                desc: 'Send money across Europe in seconds with our instant SEPA rail integration.',
              },
              {
                Icon: CreditCard, color: 'bg-purple-100 text-purple-600',
                title: 'Smart debit & credit cards',
                desc: 'Physical and virtual cards with real-time spend controls, freeze/unfreeze instantly.',
              },
              {
                Icon: TrendingUp, color: 'bg-green-500/10 text-green-600',
                title: 'Savings with interest',
                desc: 'Put your money to work with NovaSave. Up to 2.5% AER on EUR and GBP savings.',
              },
              {
                Icon: ShieldCheck, color: 'bg-red-500/10 text-red-600',
                title: 'Bank-grade security',
                desc: 'FaceID biometrics, 2FA, real-time fraud detection, and device-level encryption.',
              },
              {
                Icon: Smartphone, color: 'bg-teal-100 text-teal-600',
                title: 'Mobile-first design',
                desc: 'Full-featured iOS and Android apps. Everything you see here, in your pocket.',
              },
            ].map(({ Icon, color, title, desc }) => (
              <div key={title} className="bg-card rounded-2xl p-6 border border-border hover:shadow-sm transition-shadow">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">No hidden fees. No nasty surprises. Cancel any time.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'NovaPay Current', price: 'Free', period: 'forever',
                desc: 'Everything you need to get started.',
                features: ['EUR + USD + GBP accounts', '2 free ATM withdrawals/month', 'Virtual debit card', 'SEPA transfers from €0.20', 'Up to €10k/month'],
                cta: 'Get started free', accent: false,
              },
              {
                name: 'NovaPay Premium', price: '€9.99', period: 'per month',
                desc: 'For frequent travellers and professionals.',
                features: ['All 8 currencies', '5 free ATM withdrawals/month', 'Physical + virtual cards', 'Free domestic SEPA', 'Up to €50k/month', '0.5% FX markup', 'Priority support'],
                cta: 'Start 30-day free trial', accent: true,
              },
              {
                name: 'NovaBusiness', price: '€29.99', period: 'per month',
                desc: 'Built for companies and freelancers.',
                features: ['All 8 currencies', '10 free ATM withdrawals/month', 'Up to 5 team cards', 'Bulk SEPA transfers', 'Up to €2M/month', '0.3% FX markup', 'Dedicated account manager', 'VAT receipt capture'],
                cta: 'Contact sales', accent: false,
              },
            ].map(({ name, price, period, desc, features, cta, accent }) => (
              <div
                key={name}
                className={`rounded-2xl p-8 border ${accent ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/30' : 'border-border bg-card'}`}
              >
                {accent && (
                  <div className="inline-block bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                    Most popular
                  </div>
                )}
                <h3 className="font-semibold text-foreground mb-1">{name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-foreground">{price}</span>
                  <span className="text-muted-foreground text-sm">{period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{desc}</p>
                <Link
                  href="/register"
                  className={`block text-center py-2.5 rounded-lg font-medium text-sm mb-6 transition-colors ${
                    accent
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'border border-border text-foreground/80 hover:bg-background'
                  }`}
                >
                  {cta}
                </Link>
                <ul className="space-y-2.5">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="bg-gray-900 py-24 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-sm px-4 py-1.5 rounded-full mb-6">
                <Lock className="w-3.5 h-3.5" /> Bank-grade security
              </div>
              <h2 className="text-3xl font-bold mb-4">Your money is safe with us</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                NovaPay is regulated by the FCA and your funds are protected up to £85,000 by the FSCS.
                We use AES-256 encryption, real-time fraud monitoring, and biometric authentication.
              </p>
              <div className="space-y-4">
                {[
                  'FCA regulated financial institution',
                  'FSCS protected up to £85,000',
                  'Real-time AI fraud detection',
                  'PCI-DSS Level 1 certified',
                  '99.9% uptime SLA with 24/7 monitoring',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Transactions secured', value: '€4.2B+' },
                { label: 'Fraud detection rate', value: '99.8%' },
                { label: 'Uptime this year', value: '99.97%' },
                { label: 'Security audits/year', value: '4' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="text-2xl font-bold text-white mb-1">{value}</div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8">Join 50,000+ people who bank smarter with NovaPay. Takes 5 minutes.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Open your free account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-foreground">NovaPay</span>
            <span className="text-muted-foreground text-sm ml-2">© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Cookie policy</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground">FCA authorised · FSCS protected · PCI-DSS L1</p>
        </div>
      </footer>
    </div>
  )
}
