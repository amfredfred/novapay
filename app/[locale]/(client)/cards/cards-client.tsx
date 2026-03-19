// app/[locale]/(client)/cards/cards-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { Lock, Unlock, Eye, EyeOff, CreditCard, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { toggleCardFreeze } from '@/actions/client'
import type { Card } from '@/types/supabase'

function CardVisual({ card }: { card: Card }) {
  const gradients: Record<string, string> = {
    debit:   'from-gray-800 to-gray-900',
    credit:  'from-primary to-primary/80',
    virtual: 'from-purple-700 to-purple-900',
  }
  const expiry = new Date(card.expires_at).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })
  return (
    <div className={`relative bg-gradient-to-br ${gradients[card.card_type] ?? 'from-gray-800 to-gray-900'} rounded-2xl p-6 text-white overflow-hidden aspect-[1.586/1] select-none`}>
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-card/5" />
      <div className="absolute -right-4 -bottom-8 w-32 h-32 rounded-full bg-card/5" />
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs text-white/60 uppercase tracking-widest">{card.card_type}</p>
          {card.status === 'frozen' && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
              <Lock className="w-2.5 h-2.5" /> Frozen
            </span>
          )}
        </div>
        <span className="text-sm font-bold capitalize">{card.network}</span>
      </div>
      <div className="font-mono text-base tracking-widest text-white/80 mb-4">
        •••• •••• •••• {card.last_four}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-white/50 uppercase tracking-wide">Expires</p>
          <p className="font-mono text-sm">{expiry}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/50 uppercase tracking-wide">Daily limit</p>
          <p className="font-mono text-sm">€{card.daily_limit.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

function CardPanel({ card, onStatusChange }: { card: Card; onStatusChange: (id: string, status: string) => void }) {
  const [isPending, start] = useTransition()
  const [showDetails, setShowDetails] = useState(false)

  function handleFreeze() {
    start(async () => {
      try {
        const res = await toggleCardFreeze(card.id, card.status)
        if (!res.success) { toast.error('Failed', { description: res.error }); return }
        const newStatus = res.data?.newStatus ?? 'active'
        onStatusChange(card.id, newStatus)
        toast.success(newStatus === 'frozen' ? 'Card frozen' : 'Card unfrozen')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="space-y-4">
      <CardVisual card={card} />
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        <button
          onClick={handleFreeze}
          disabled={isPending || card.status === 'cancelled' || card.status === 'expired'}
          className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors text-left hover:bg-muted/50 disabled:opacity-50 ${card.status !== 'frozen' ? 'text-amber-600' : 'text-green-600'}`}
        >
          {isPending
            ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            : card.status === 'frozen'
              ? <Unlock className="h-4 w-4 text-green-500" />
              : <Lock className="h-4 w-4 text-amber-400" />
          }
          {card.status === 'frozen' ? 'Unfreeze card' : 'Freeze card'}
        </button>
        <button
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground/80 transition-colors text-left hover:bg-muted/50"
        >
          {showDetails ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          {showDetails ? 'Hide details' : 'View card details'}
        </button>
        {showDetails && (
          <div className="px-4 py-3 bg-muted/50 space-y-2 text-sm">
            {[
              ['Card number', `•••• •••• •••• ${card.last_four}`],
              ['Type',        card.card_type + (card.is_virtual ? ' (virtual)' : '')],
              ['Network',     card.network],
              ['Daily limit', `€${card.daily_limit.toLocaleString()}`],
              ['Monthly spent', `€${card.monthly_spent.toFixed(2)}`],
              ['Status',      card.status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium font-mono text-xs capitalize">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Monthly spending</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Spent</span>
          <span className="font-mono text-sm font-semibold">€{card.monthly_spent.toFixed(2)}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, (card.monthly_spent / (card.daily_limit * 30)) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          €{Math.max(0, card.daily_limit * 30 - card.monthly_spent).toFixed(0)} remaining of €{(card.daily_limit * 30).toLocaleString()} monthly limit
        </p>
      </div>
    </div>
  )
}

export function CardsClient({ initialCards }: { initialCards: Card[] }) {
  const [cards, setCards] = useState(initialCards)

  function onStatusChange(id: string, status: string) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, status: status as Card['status'] } : c))
  }

  if (cards.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border p-16 text-center">
        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">No cards yet</h3>
        <p className="text-sm text-muted-foreground mb-6">Get a virtual card instantly, or order a physical card delivered to you</p>
        <button className="inline-flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Get your first card
        </button>
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {cards.map(card => (
        <CardPanel key={card.id} card={card} onStatusChange={onStatusChange} />
      ))}
    </div>
  )
}
