// app/[locale]/(client)/receive/receive-client.tsx
'use client'

import { useState, useTransition } from 'react'
import {
  ArrowLeft, CheckCircle2, Clock, Globe, Upload,
  Copy, Loader2, AlertCircle, ArrowDownLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { createDeposit, markPaymentSent } from '@/actions/gateways'
import type { PaymentGateway } from '@/types/supabase'
import type { Currency } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface Account { id: string; currency: string; balance: number; name: string }

interface Props {
  accounts:  Account[]
  gateways:  PaymentGateway[]
  deposits:  Array<Record<string, unknown>>
}

const TYPE_ICONS: Record<string, string> = {
  bank:    '🏦',
  crypto:  '₿',
  ewallet: '💳',
  manual:  '💸',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  pending:      { label: 'Awaiting your payment', color: 'text-muted-foreground',   Icon: Clock },
  payment_sent: { label: 'Under review',           color: 'text-amber-600',  Icon: Clock },
  approved:     { label: 'Credited to account',    color: 'text-green-600',  Icon: CheckCircle2 },
  rejected:     { label: 'Rejected',               color: 'text-red-600',    Icon: AlertCircle },
}

export function ReceiveClient({ accounts, gateways, deposits }: Props) {
  const [step, setStep]               = useState<'select' | 'form' | 'instructions' | 'history'>('select')
  const [selectedGateway, setGateway] = useState<PaymentGateway | null>(null)
  const [selectedAccount, setAccount] = useState(accounts[0]?.id ?? '')
  const [amount, setAmount]           = useState('')
  const [currency, setCurrency]       = useState(accounts[0]?.currency ?? 'EUR')
  const [reference, setReference]     = useState('')
  const [depositId, setDepositId]     = useState<string | null>(null)
  const [proofFile, setProofFile]     = useState<File | null>(null)
  const [uploading, setUploading]     = useState(false)
  const [isPending, start]            = useTransition()

  // Generate a unique reference
  function generateRef() {
    return 'NP-' + Math.random().toString(36).slice(2, 8).toUpperCase()
  }

  function pickGateway(gw: PaymentGateway) {
    setGateway(gw)
    setReference(generateRef())
    // Filter account to match gateway currency if possible
    const matchingAccount = accounts.find(a => gw.currencies.includes(a.currency))
    if (matchingAccount) {
      setAccount(matchingAccount.id)
      setCurrency(matchingAccount.currency)
    } else if (gw.currencies[0]) {
      setCurrency(gw.currencies[0])
    }
    setStep('form')
  }

  function submitDeposit() {
    const num = parseFloat(amount)
    if (!amount || isNaN(num) || num <= 0) { toast.error('Enter a valid amount'); return }
    if (!selectedAccount) { toast.error('Select an account'); return }
    start(async () => {
      try {
        const result = await createDeposit({
        accountId: selectedAccount,
        gatewayId: selectedGateway!.id,
        amount:    num,
        currency,
        reference,
        })
        if (!result?.success) { toast.error(result?.error); return }
        setDepositId(result?.data.id)
        setStep('instructions')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  async function uploadProofAndMark() {
    if (!depositId) return
    setUploading(true)
    let proofUrl: string | undefined

    try {
      if (proofFile) {
        const supabase = createClient()
        const ext  = proofFile.name.split('.').pop()
        const path = `deposits/${depositId}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('kyc-documents')   // reuse existing bucket for now
          .upload(path, proofFile, { upsert: true })
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('kyc-documents').getPublicUrl(path)
        proofUrl = publicUrl
      }
      const res = await markPaymentSent(depositId, proofUrl)
      if (!res.success) { toast.error(res.error); return }
      toast.success('Payment marked as sent — our team will review shortly')
      setStep('history')
    } catch (err) {
      toast.error('Failed', { description: (err as Error).message })
    } finally {
      setUploading(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  // ── Step: select gateway ───────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Receive money</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Choose how you want to deposit funds into your account</p>
        </div>

        {gateways.length === 0 ? (
          <div className="bg-muted/50 rounded-2xl border border-dashed border-border p-12 text-center">
            <Globe className="w-10 h-10 text-muted-foreground/70 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">No deposit methods available</p>
            <p className="text-sm text-muted-foreground mt-1">Contact support or check back later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gateways.map(gw => {
              const details = gw.details as Record<string, string>
              return (
                <button key={gw.id} onClick={() => pickGateway(gw)}
                  className="w-full text-left bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center shrink-0">
                      {gw.logo_url
                        ? <img src={gw.logo_url} alt={gw.name} className="w-9 h-9 object-contain" />
                        : <span className="text-xl">{TYPE_ICONS[gw.type] ?? '💸'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-foreground">{gw.name}</p>
                        <span className="text-xs text-muted-foreground capitalize">{gw.type}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {gw.currencies.map(c => (
                          <span key={c} className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{c}</span>
                        ))}
                      </div>
                    </div>
                    <ArrowDownLeft className="w-5 h-5 text-muted-foreground/70 group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Past deposits */}
        {deposits.length > 0 && (
          <button onClick={() => setStep('history')}
            className="w-full text-center text-sm text-primary hover:underline mt-2">
            View deposit history ({deposits.length})
          </button>
        )}
      </div>
    )
  }

  // ── Step: amount form ──────────────────────────────────────────────────────
  if (step === 'form' && selectedGateway) {
    const gw = selectedGateway
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <button onClick={() => setStep('select')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
            {gw.logo_url
              ? <img src={gw.logo_url} alt={gw.name} className="w-8 h-8 object-contain" />
              : <span className="text-lg">{TYPE_ICONS[gw.type] ?? '💸'}</span>
            }
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Deposit via {gw.name}</h2>
            <p className="text-xs text-muted-foreground">Enter the amount you are sending</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          {/* Amount + currency */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Amount you are sending</label>
            <div className="flex gap-2">
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="px-3 py-2.5 border border-border rounded-xl text-sm font-mono bg-card focus:outline-none w-24">
                {gw.currencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" step="0.01" min="0" placeholder="0.00"
                value={amount} onChange={e => setAmount(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-border rounded-xl text-lg font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-ring/30 text-right" />
            </div>
          </div>

          {/* Target account */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Credit to account</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {accounts.filter(a => gw.currencies.includes(a.currency) || !gw.currencies.length).map(acct => (
                <button key={acct.id} type="button" onClick={() => { setAccount(acct.id); setCurrency(acct.currency) }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedAccount === acct.id ? 'border-blue-600 bg-primary/10' : 'border-border hover:border-border'
                  }`}>
                  <p className="font-mono font-bold text-sm">{acct.currency}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{acct.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Payment reference */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your payment reference</label>
            <div className="flex gap-2">
              <input value={reference} onChange={e => setReference(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/30" />
              <button onClick={() => setReference(generateRef())}
                className="px-3 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                Regenerate
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Include this reference when you make your payment so we can match it</p>
          </div>

          <button onClick={submitDeposit} disabled={isPending || !amount || !selectedAccount}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Continue to payment details'}
          </button>
        </div>
      </div>
    )
  }

  // ── Step: payment instructions ─────────────────────────────────────────────
  if (step === 'instructions' && selectedGateway && depositId) {
    const gw      = selectedGateway
    const details = gw.details as Record<string, string>
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Deposit request created</h2>
            <p className="text-xs text-muted-foreground">Follow the instructions below to send your payment</p>
          </div>
        </div>

        {/* Summary box */}
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-primary uppercase tracking-wide font-semibold">Amount</p>
              <p className="font-mono font-bold text-blue-800 mt-1">{formatCurrency(parseFloat(amount), currency as Currency)}</p>
            </div>
            <div>
              <p className="text-xs text-primary uppercase tracking-wide font-semibold">Via</p>
              <p className="font-semibold text-blue-800 mt-1">{gw.name}</p>
            </div>
            <div>
              <p className="text-xs text-primary uppercase tracking-wide font-semibold">Reference</p>
              <p className="font-mono font-bold text-blue-800 mt-1">{reference}</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Payment instructions</p>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{gw.instructions}</p>
        </div>

        {/* Payment details */}
        {Object.entries(details).length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Payment details</p>
            <div className="space-y-3">
              {Object.entries(details).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="text-xs text-muted-foreground">{key}</p>
                    <p className="font-mono font-semibold text-sm text-foreground mt-0.5 break-all">{value}</p>
                  </div>
                  <button onClick={() => copyToClipboard(value, key)}
                    className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted/80 rounded-lg transition-colors shrink-0">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {/* Always show reference */}
              <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div>
                  <p className="text-xs text-amber-600 font-semibold">⚠ Include this reference</p>
                  <p className="font-mono font-bold text-amber-800 mt-0.5">{reference}</p>
                </div>
                <button onClick={() => copyToClipboard(reference, 'Reference')}
                  className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-500/20 rounded-lg transition-colors shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload proof + mark sent */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-semibold text-foreground">After sending payment</p>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Upload payment proof <span className="font-normal normal-case">(screenshot or receipt — optional but speeds up approval)</span>
            </label>
            <label className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${proofFile ? 'border-green-500/40 bg-green-500/10' : 'border-border hover:border-primary/50 hover:bg-primary/10'}`}>
              <Upload className={`h-5 w-5 shrink-0 ${proofFile ? 'text-green-600' : 'text-muted-foreground'}`} />
              <span className="text-sm text-muted-foreground">
                {proofFile ? proofFile.name : 'Click to upload screenshot or PDF'}
              </span>
              <input type="file" accept="image/*,.pdf" className="hidden"
                onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <button onClick={uploadProofAndMark} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><CheckCircle2 className="w-4 h-4" /> I've sent the payment</>}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Our team will verify and credit your account within 24 hours
          </p>
        </div>
      </div>
    )
  }

  // ── Step: deposit history ──────────────────────────────────────────────────
  if (step === 'history') {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Deposit history</h2>
          <button onClick={() => setStep('select')}
            className="text-sm font-medium text-primary hover:underline">
            + New deposit
          </button>
        </div>

        {deposits.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No deposits yet</div>
        ) : (
          <div className="space-y-3">
            {deposits.map(d => {
              const status = STATUS_CONFIG[d['status'] as string] ?? STATUS_CONFIG['pending']!
              const StatusIcon = status.Icon
              return (
                <div key={d['id'] as string} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${status.color}`} />
                      <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    <span className="font-mono font-bold text-foreground">
                      {formatCurrency(d['amount'] as number, d['currency'] as Currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{d['reference'] as string}</span>
                    <span>{formatDateTime(d['created_at'] as string)}</span>
                  </div>
                  {d['status'] === 'pending' && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Haven't paid yet? Mark it when done:</p>
                      <button onClick={() => { setDepositId(d['id'] as string); setStep('instructions') }}
                        className="text-xs font-medium text-primary hover:underline">
                        View payment details →
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return null
}
