// app/[locale]/(client)/exchange/_components/exchange-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { ArrowLeftRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { executeExchange } from '@/actions/client'
import type { Currency } from '@/types'

interface Account { id: string; balance: number; currency: string; products: { name: string } | null }
interface Props { accounts: Account[]; rates: Record<string, number> }

export function ExchangeForm({ accounts, rates }: Props) {
  const [fromCcy, setFromCcy] = useState(accounts[0]?.currency ?? 'EUR')
  const [toCcy,   setToCcy]   = useState(accounts.find(a => a.currency !== (accounts[0]?.currency ?? 'EUR'))?.currency ?? accounts[1]?.currency ?? '')
  const [amount,  setAmount]  = useState('')
  const [done,    setDone]    = useState(false)
  const [convertedFinal, setConvertedFinal] = useState(0)
  const [isPending, start]    = useTransition()

  const fromRate  = rates[fromCcy] ?? 1
  const toRate    = rates[toCcy] ?? 1
  const converted = amount ? (parseFloat(amount) / fromRate) * toRate * 0.995 : 0
  const fromAcct  = accounts.find(a => a.currency === fromCcy)
  const toAcct    = accounts.find(a => a.currency === toCcy)
  const insufficient = fromAcct && parseFloat(amount) > fromAcct.balance

  function swap() {
    setFromCcy(toCcy)
    setToCcy(fromCcy)
    setAmount('')
  }

  function handleExchange() {
    const num = parseFloat(amount)
    if (!amount || isNaN(num) || num <= 0) { toast.error('Enter a valid amount'); return }
    if (insufficient) { toast.error('Insufficient balance'); return }
    if (!fromAcct) { toast.error('Source account not found'); return }

    start(async () => {
      try {
        const result = await executeExchange({
          fromAccountId: fromAcct.id,
          toAccountId:   toAcct?.id,
          fromCurrency:  fromCcy,
          toCurrency:    toCcy,
          fromAmount:    num,
          toAmount:      converted,
          rate:          (1 / fromRate) * toRate,
        })
        if (!result?.success) {
          toast.error('Exchange failed', { description: result?.error ?? 'Unknown error' })
          return
        }
        setConvertedFinal(converted)
        setDone(true)
        toast.success('Exchange complete')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err?.message ?? 'Exchange failed. Please try again.')
      }
    })
  }

  if (done) {
    return (
      <div className="bg-card rounded-2xl border border-border p-10 text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Exchange complete!</h2>
        <p className="text-muted-foreground text-sm mb-8">
          {formatCurrency(convertedFinal, toCcy as Currency)} credited to your {toCcy} account
        </p>
        <button
          onClick={() => { setDone(false); setAmount('') }}
          className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          Make another exchange
        </button>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="font-semibold text-foreground">Convert currency</h2>
        <p className="text-xs text-muted-foreground mt-0.5">0.5% exchange fee included in rate</p>
      </div>
      <div className="p-5 space-y-4">
        {/* From */}
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
            {fromAcct && (
              <span className="text-xs text-muted-foreground">
                Available: {formatCurrency(fromAcct.balance, fromCcy as Currency)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={fromCcy}
              onChange={e => setFromCcy(e.target.value)}
              className="font-mono font-semibold text-foreground bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none w-24"
            >
              {accounts.map(a => <option key={a.id} value={a.currency}>{a.currency}</option>)}
            </select>
            <input
              type="number" step="0.01" min="0" placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 font-mono text-2xl font-semibold text-foreground focus:outline-none text-right bg-transparent placeholder:text-muted-foreground/40"
            />
          </div>
          {insufficient && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" /> Insufficient balance
            </div>
          )}
        </div>

        {/* Swap */}
        <div className="flex justify-center">
          <button
            onClick={swap}
            className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/15 hover:text-primary transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* To */}
        <div className="border border-border rounded-xl p-4 bg-muted/50/50">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">You receive</label>
            {toAcct && (
              <span className="text-xs text-muted-foreground">
                Balance: {formatCurrency(toAcct.balance, toCcy as Currency)}
              </span>
            )}
            {!toAcct && toCcy && (
              <span className="text-xs text-amber-600">No {toCcy} account — will be created</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={toCcy}
              onChange={e => setToCcy(e.target.value)}
              className="font-mono font-semibold text-foreground bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none w-24"
            >
              {accounts.filter(a => a.currency !== fromCcy).map(a => <option key={a.currency} value={a.currency}>{a.currency} — {a.products?.name ?? a.currency}</option>)}
            </select>
            <span className="flex-1 font-mono text-2xl font-semibold text-muted-foreground text-right">
              {converted > 0 ? formatCurrency(converted, toCcy as Currency) : '—'}
            </span>
          </div>
        </div>

        {/* Rate */}
        {amount && parseFloat(amount) > 0 && !insufficient && (
          <p className="text-xs text-muted-foreground text-center">
            1 {fromCcy} = {((1 / fromRate) * toRate * 0.995).toFixed(4)} {toCcy} (after 0.5% fee)
          </p>
        )}

        <button
          onClick={handleExchange}
          disabled={isPending || !amount || parseFloat(amount) <= 0 || !!insufficient}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Exchanging…</>
            : `Exchange ${fromCcy} → ${toCcy}`
          }
        </button>
      </div>
    </div>
  )
}
