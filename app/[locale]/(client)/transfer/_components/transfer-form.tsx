'use client'

import { useState, useTransition } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Send, CheckCircle2, Loader2, ArrowLeft, AlertCircle, Lock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { executeTransfer } from '@/actions/client'
import type { Currency } from '@/types'
import Link from 'next/link'

interface Account { id: string; balance: number; currency: string; products: { name: string } | null }
interface FieldDef  { key: string; label: string; placeholder: string; required: boolean }
interface Method    { id: string; name: string; type: string; instructions: string; fields: FieldDef[]; currencies: string[] }
interface Props     { accounts: Account[]; methods: Method[] }

export function TransferForm({ accounts, methods }: Props) {
  const [step, setStep]         = useState<'method' | 'form' | 'pin' | 'done'>('method')
  const [method, setMethod]     = useState<Method | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [amount, setAmount]     = useState('')
  const [fromId, setFromId]     = useState(accounts[0]?.id ?? '')
  const [pin, setPin]           = useState('')
  const [pinErr, setPinErr]     = useState('')
  const [isPending, start]      = useTransition()

  const fromAccount = accounts.find(a => a.id === fromId)
  const numAmount   = parseFloat(amount) || 0
  const insufficient = fromAccount ? numAmount > fromAccount.balance : false

  function selectMethod(m: Method) {
    setMethod(m)
    // Pre-filter accounts to ones this method accepts
    const compatible = accounts.find(a => m.currencies.includes(a.currency))
    if (compatible) setFromId(compatible.id)
    setStep('form')
  }

  function submitForm() {
    if (!method || !fromAccount) return
    if (!amount || numAmount <= 0) { toast.error('Enter a valid amount'); return }
    if (insufficient) { toast.error('Insufficient balance'); return }
    // Validate required fields
    for (const f of method.fields) {
      if (f.required && !formData[f.key]?.trim()) {
        toast.error(`${f.label} is required`)
        return
      }
    }
    setStep('pin')
  }

  function submitWithPin() {
    setPinErr('')
    if (pin.length < 4) { setPinErr('Enter your 4-digit transaction PIN'); return }
    start(async () => {
      try {
        // PIN is verified atomically inside executeTransfer — one round-trip
        const result = await executeTransfer({
          fromAccountId:  fromId,
          transferType:   method!.type as any,
          recipientName:  formData['name'] ?? formData['paypal_email'] ?? formData['wallet'] ?? formData['email'] ?? 'Recipient',
          recipientIban:  formData['iban'],
          recipientEmail: formData['email'] ?? formData['paypal_email'],
          amount:         numAmount,
          currency:       fromAccount!.currency,
          reference:      formData['reference'],
          methodFields:   formData,
          txPin:          pin,
        })
        if (!result?.success) {
          const msg = result?.error ?? 'Transfer failed'
          // Show PIN error inline if it's PIN-related
          if (msg.toLowerCase().includes('pin')) {
            setPinErr(msg)
          } else {
            toast.error(msg)
          }
          return
        }
        setStep('done')
        toast.success('Transfer submitted')
      } catch (err: any) {
        // Catch redirect() throws or network errors
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err // let Next.js handle redirects
        toast.error(err?.message ?? 'Something went wrong. Please try again.')
      }
    })
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="bg-card rounded-2xl border border-border p-10 text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Transfer submitted</h2>
        <p className="text-muted-foreground text-sm mb-1">
          {formatCurrency(numAmount, fromAccount?.currency as Currency ?? 'EUR')} via {method?.name}
        </p>
        <p className="text-xs text-muted-foreground mb-8">
          {method?.type === 'internal' ? 'Credited instantly' : 'Typically arrives within 1–3 business days'}
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => { setStep('method'); setMethod(null); setFormData({}); setAmount(''); setPin('') }}
            className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            New transfer
          </button>
          <Link href="/transactions"
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            View transactions
          </Link>
        </div>
      </div>
    )
  }

  // ── PIN step ─────────────────────────────────────────────────────────────
  if (step === 'pin') {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Confirm with PIN</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Sending {formatCurrency(numAmount, fromAccount?.currency as Currency ?? 'EUR')} via {method?.name}
        </p>
        <div className="flex justify-center gap-3 mb-4">
          {[0,1,2,3].map(i => (
            <input key={i} type="password" inputMode="numeric" maxLength={1}
              value={pin[i] ?? ''}
              onChange={e => {
                const val = e.target.value.replace(/\D/g,'')
                const arr = pin.split('')
                arr[i] = val
                const next = arr.join('').slice(0,4)
                setPin(next)
                setPinErr('')
                if (val && i < 3) {
                  const inputs = document.querySelectorAll<HTMLInputElement>('[data-pin]')
                  inputs[i+1]?.focus()
                }
              }}
              data-pin={i}
              className="w-12 h-12 text-center text-xl font-bold bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          ))}
        </div>
        {pinErr && <p className="text-sm text-destructive mb-3">{pinErr}</p>}
        <div className="flex gap-3 justify-center mt-4">
          <button onClick={() => { setStep('form'); setPin(''); setPinErr('') }}
            className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            Back
          </button>
          <button onClick={submitWithPin} disabled={isPending || pin.length < 4}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Confirm send
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          No PIN set?{' '}
          <Link href="/settings?tab=security" className="text-primary hover:underline">Set it in Settings → Security</Link>
        </p>
      </div>
    )
  }

  // ── Form step ─────────────────────────────────────────────────────────────
  if (step === 'form' && method) {
    const compatibleAccounts = accounts.filter(a => method.currencies.includes(a.currency))
    const cls = 'w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors'
    return (
      <div className="space-y-4">
        <button onClick={() => setStep('method')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to methods
        </button>

        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{method.name}</p>
              <p className="text-xs text-muted-foreground">{method.instructions}</p>
            </div>
          </div>

          {/* From account */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">From account</label>
            <select value={fromId} onChange={e => setFromId(e.target.value)} className={cls}>
              {compatibleAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.products?.name ?? a.currency} — {formatCurrency(a.balance, a.currency as Currency)}
                </option>
              ))}
            </select>
            {compatibleAccounts.length === 0 && (
              <p className="text-xs text-destructive mt-1">You have no account in a supported currency ({method.currencies.join(', ')})</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Amount</label>
            <div className="flex gap-2">
              <input type="number" step="0.01" min="0.01"
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className={`flex-1 font-mono text-lg ${cls}`}
              />
              <span className="flex items-center px-3 bg-muted border border-border rounded-xl text-sm font-mono font-semibold text-muted-foreground">
                {fromAccount?.currency ?? '—'}
              </span>
            </div>
            {insufficient && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Insufficient balance — available: {formatCurrency(fromAccount!.balance, fromAccount!.currency as Currency)}
              </p>
            )}
          </div>

          {/* Dynamic fields from method config */}
          {method.fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
              <input
                type={f.key === 'email' || f.key === 'paypal_email' ? 'email' : 'text'}
                value={formData[f.key] ?? ''}
                onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={cls}
              />
            </div>
          ))}

          {/* Reference */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Reference <span className="normal-case font-normal">(optional)</span></label>
            <input
              value={formData['reference'] ?? ''}
              onChange={e => setFormData(p => ({ ...p, reference: e.target.value }))}
              placeholder="Invoice #123, rent, etc."
              maxLength={140}
              className={cls}
            />
          </div>

          <button onClick={submitForm} disabled={!amount || insufficient || compatibleAccounts.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
            Continue to PIN
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // ── Method selection ──────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {methods.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground text-sm">No transfer methods available. Contact support.</p>
        </div>
      ) : methods.map(m => (
        <button key={m.id} onClick={() => selectMethod(m)}
          className="w-full flex items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:bg-muted/30 transition-all text-left group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{m.name}</p>
              <p className="text-xs text-muted-foreground truncate">{m.instructions.slice(0, 70)}{m.instructions.length > 70 ? '…' : ''}</p>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {m.currencies.slice(0,4).map(c => (
                  <span key={c} className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{c}</span>
                ))}
              </div>
            </div>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0 group-hover:text-primary transition-colors" />
        </button>
      ))}
    </div>
  )
}
