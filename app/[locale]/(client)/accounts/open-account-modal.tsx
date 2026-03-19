// app/[locale]/(client)/accounts/open-account-modal.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { openAccount } from '@/actions/client'

interface Product { id: string; name: string; type: string; supported_currencies: string[] }

interface Props {
  products: Product[]
  existingCurrencies: string[]
}

export function OpenAccountModal({ products, existingCurrencies }: Props) {
  const router = useRouter()
  const [open, setOpen]           = useState(false)
  const [productId, setProductId] = useState('')
  const [currency, setCurrency]   = useState('')
  const [done, setDone]           = useState(false)
  const [isPending, start]        = useTransition()

  const selectedProduct = products.find(p => p.id === productId)
  const availableCurrencies = (selectedProduct?.supported_currencies ?? [])
    .filter(c => !existingCurrencies.includes(c))

  function handleOpen() {
    if (!productId || !currency) { toast.error('Select a product and currency'); return }
    start(async () => {
      try {
        const result = await openAccount({ productId, currency })
        if (!result?.success) { toast.error(result?.error); return }
        setDone(true)
        setTimeout(() => {
        setOpen(false)
        setDone(false)
        setProductId('')
        setCurrency('')
        router.refresh()
        }, 1500)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-medium border border-border text-muted-foreground px-4 py-2 rounded-xl hover:bg-muted/50 transition-colors"
      >
        <Plus className="h-4 w-4" /> Open account
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Open new account</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {done ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-foreground">Account opened!</p>
                <p className="text-sm text-muted-foreground mt-1">Your new account is ready to use</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Product
                  </label>
                  <select
                    value={productId}
                    onChange={e => { setProductId(e.target.value); setCurrency('') }}
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 bg-card"
                  >
                    <option value="">Select a product…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {selectedProduct && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Currency
                    </label>
                    {availableCurrencies.length === 0 ? (
                      <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        You already have accounts in all supported currencies for this product
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {availableCurrencies.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCurrency(c)}
                            className={`py-2 rounded-xl text-sm font-mono font-semibold border transition-all ${
                              currency === c
                                ? 'bg-primary text-white border-blue-600'
                                : 'border-border text-foreground/80 hover:border-primary/50 hover:bg-primary/10'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOpen}
                    disabled={isPending || !productId || !currency}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening…</> : 'Open account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
