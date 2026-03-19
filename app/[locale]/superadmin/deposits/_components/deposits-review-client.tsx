// app/[locale]/superadmin/deposits/_components/deposits-review-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2, XCircle, Clock, ExternalLink,
  Loader2, Eye, Globe,
} from 'lucide-react'
import { approveDeposit, rejectDeposit } from '@/actions/gateways'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Currency } from '@/types'

interface EnrichedDeposit {
  id:           string
  user_id:      string
  user_name:    string
  user_email:   string
  gateway_name: string
  gateway_logo: string | null
  amount:       number
  currency:     string
  status:       string
  reference:    string
  proof_url:    string | null
  admin_notes:  string | null
  created_at:   string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Awaiting payment',   color: 'bg-muted text-muted-foreground' },
  payment_sent: { label: 'Payment sent',        color: 'bg-amber-100 text-amber-700' },
  approved:     { label: 'Approved',            color: 'bg-green-100 text-green-700' },
  rejected:     { label: 'Rejected',            color: 'bg-red-100 text-red-700' },
  cancelled:    { label: 'Cancelled',           color: 'bg-muted text-muted-foreground' },
}

function DepositRow({ deposit, onAction }: {
  deposit: EnrichedDeposit
  onAction: (id: string, action: 'approve' | 'reject') => void
}) {
  const [showReject, setShowReject] = useState(false)
  const [notes, setNotes]           = useState('')
  const [isPending, start]          = useTransition()
  const cfg = STATUS_CONFIG[deposit.status] ?? STATUS_CONFIG['pending']!

  function approve() {
    start(async () => {
      try {
        const res = await approveDeposit(deposit.id)
        if (!res.success) { toast.error(res.error); return }
        toast.success(`Deposit approved — ${formatCurrency(deposit.amount, deposit.currency as Currency)} credited`)
        onAction(deposit.id, 'approve')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  function reject() {
    start(async () => {
      try {
        const res = await rejectDeposit(deposit.id, notes)
        if (!res.success) { toast.error(res.error); return }
        toast.success('Deposit rejected')
        setShowReject(false)
        onAction(deposit.id, 'reject')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className={`border border-border rounded-xl p-5 transition-all ${deposit.status === 'payment_sent' ? 'border-amber-400/40 bg-amber-500/5' : 'bg-card'}`}>
      <div className="flex items-start gap-4">
        {/* Gateway logo */}
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          {deposit.gateway_logo
            ? <img src={deposit.gateway_logo} alt={deposit.gateway_name} className="w-8 h-8 object-contain" />
            : <Globe className="w-5 h-5 text-muted-foreground" />
          }
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="font-semibold text-sm">{deposit.user_name}</p>
              <p className="text-xs text-muted-foreground">{deposit.user_email}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-bold text-lg tabular-nums">
                {formatCurrency(deposit.amount, deposit.currency as Currency)}
              </p>
              <p className="text-xs text-muted-foreground">via {deposit.gateway_name}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <span className="text-muted-foreground">Reference: </span>
              <span className="font-mono font-medium">{deposit.reference}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Submitted: </span>
              <span>{formatDateTime(deposit.created_at)}</span>
            </div>
          </div>

          {/* Proof link */}
          {deposit.proof_url && (
            <a href={deposit.proof_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mb-3">
              <Eye className="h-3.5 w-3.5" /> View payment proof <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {!deposit.proof_url && deposit.status === 'payment_sent' && (
            <p className="text-xs text-amber-600 mb-3">⚠ No proof uploaded — verify payment independently</p>
          )}

          {/* Status + actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
              {cfg.label}
            </span>

            {(deposit.status === 'pending' || deposit.status === 'payment_sent') && (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowReject(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
                <button onClick={approve} disabled={isPending}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60">
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve &amp; credit
                </button>
              </div>
            )}
          </div>

          {/* Reject form */}
          {showReject && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Reason for rejection (shown to user)…" rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowReject(false)}
                  className="flex-1 py-1.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={reject} disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-semibold py-1.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm rejection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const FILTER_TABS = [
  { key: 'all',          label: 'All' },
  { key: 'payment_sent', label: 'Needs review' },
  { key: 'pending',      label: 'Awaiting payment' },
  { key: 'approved',     label: 'Approved' },
  { key: 'rejected',     label: 'Rejected' },
]

export function DepositsReviewClient({ deposits: initial }: { deposits: EnrichedDeposit[] }) {
  const [deposits, setDeposits] = useState(initial)
  const [filter, setFilter]     = useState('all')

  function handleAction(id: string, action: 'approve' | 'reject') {
    setDeposits(prev => prev.map(d =>
      d.id === id ? { ...d, status: action === 'approve' ? 'approved' : 'rejected' } : d
    ))
  }

  const filtered = filter === 'all' ? deposits : deposits.filter(d => d.status === filter)
  const paymentSentCount = deposits.filter(d => d.status === 'payment_sent').length

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(({ key, label }) => {
          const count = key === 'all' ? deposits.length : deposits.filter(d => d.status === key).length
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>
              {label}
              {key === 'payment_sent' && paymentSentCount > 0 ? (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {paymentSentCount}
                </span>
              ) : (
                <span className="text-[11px] opacity-60">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No deposits</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === 'all' ? 'Deposit requests will appear here' : `No ${filter.replace('_', ' ')} deposits`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <DepositRow key={d.id} deposit={d} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  )
}
