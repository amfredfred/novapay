// app/[locale]/(client)/onboarding/onboarding-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, CheckCircle2, ArrowRight, Loader2, Globe, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { openAccount } from '@/actions/client'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/types'

interface Product {
  id: string; name: string; type: string
  supported_currencies: string[]; monthly_fee: number; fee_currency: string
}

interface Props {
  userId:   string
  products: Product[]
}

const STEP_LABELS = ['Welcome', 'Choose account', 'Pick currency', 'Done']

const CURRENCY_INFO: Record<string, { flag: string; name: string }> = {
  EUR: { flag: '🇪🇺', name: 'Euro' },
  USD: { flag: '🇺🇸', name: 'US Dollar' },
  GBP: { flag: '🇬🇧', name: 'British Pound' },
  CHF: { flag: '🇨🇭', name: 'Swiss Franc' },
  NGN: { flag: '🇳🇬', name: 'Nigerian Naira' },
  JPY: { flag: '🇯🇵', name: 'Japanese Yen' },
  CAD: { flag: '🇨🇦', name: 'Canadian Dollar' },
  AUD: { flag: '🇦🇺', name: 'Australian Dollar' },
}

export function OnboardingClient({ userId, products }: Props) {
  const router = useRouter()
  const [step, setStep]             = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState('')
  const [isPending, start]          = useTransition()

  function handleProductSelect(product: Product) {
    setSelectedProduct(product)
    // Auto-select EUR or first currency
    const defaultCcy = product.supported_currencies.includes('EUR') ? 'EUR' : product.supported_currencies[0] ?? ''
    setSelectedCurrency(defaultCcy)
    setStep(2)
  }

  function createAccount() {
    if (!selectedProduct || !selectedCurrency) return
    start(async () => {
      try {
        const result = await openAccount({ productId: selectedProduct.id, currency: selectedCurrency })
        if (!result?.success) { toast.error(result?.error); return }
        setStep(3)
        setTimeout(() => router.push('/dashboard'), 2000)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="min-h-screen bg-muted/50 flex flex-col items-center justify-center p-6">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-10">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
              i < step ? 'bg-primary text-white' :
              i === step ? 'bg-primary text-white ring-4 ring-blue-100' :
              'bg-muted/80 text-muted-foreground'
            }`}>
              {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <div className="w-8 h-px bg-muted/80" />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg">

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Welcome to NovaPay</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              You're just a few steps away from your new multi-currency account.
              Let's get you set up — it takes under 2 minutes.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: Globe, label: '8 currencies', sub: 'Hold & exchange' },
                { icon: ShieldCheck, label: 'FSCS protected', sub: 'Up to £85,000' },
                { icon: Landmark, label: 'Free SEPA', sub: 'Instant transfers' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="bg-card rounded-xl border border-border p-4 text-center">
                  <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(1)}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-colors">
              Get started <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: Choose product */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2 text-center">Choose your account type</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">You can add more account types later</p>
            <div className="space-y-3">
              {products.map(product => (
                <button key={product.id} onClick={() => handleProductSelect(product)}
                  className="w-full text-left bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                        {product.type.replace(/_/g, ' ')} ·{' '}
                        {product.monthly_fee === 0
                          ? 'Free'
                          : `${formatCurrency(product.monthly_fee, product.fee_currency as Currency)}/month`}
                      </p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {product.supported_currencies.map(c => (
                          <span key={c} className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{c}</span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground/70 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Pick currency */}
        {step === 2 && selectedProduct && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2 text-center">Pick your primary currency</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Your first account currency. You can add others later.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {selectedProduct.supported_currencies.map(ccy => {
                const info = CURRENCY_INFO[ccy]
                return (
                  <button key={ccy} onClick={() => setSelectedCurrency(ccy)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      selectedCurrency === ccy
                        ? 'border-blue-600 bg-primary/10'
                        : 'border-border hover:border-border bg-card'
                    }`}>
                    <span className="text-2xl">{info?.flag ?? '💱'}</span>
                    <div>
                      <p className={`font-bold text-sm ${selectedCurrency === ccy ? 'text-blue-700' : 'text-foreground'}`}>{ccy}</p>
                      <p className="text-xs text-muted-foreground">{info?.name ?? ccy}</p>
                    </div>
                    {selectedCurrency === ccy && (
                      <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted/50 transition-colors">
                Back
              </button>
              <button onClick={createAccount} disabled={!selectedCurrency || isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <>Open account <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">You're all set! 🎉</h2>
            <p className="text-muted-foreground mb-4">
              Your {selectedProduct?.name} account in {selectedCurrency} is ready.
              Redirecting to your dashboard…
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Setting things up…
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
