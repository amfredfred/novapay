// app/[locale]/superadmin/gateways/_components/gateways-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Loader2, Globe, Bitcoin,
  Landmark, Wallet, Eye, EyeOff, GripVertical,
} from 'lucide-react'
import { upsertGateway, deleteGateway } from '@/actions/gateways'
import type { PaymentGateway } from '@/types/supabase'

const TYPE_ICONS: Record<string, React.ElementType> = {
  bank:    Landmark,
  crypto:  Bitcoin,
  ewallet: Wallet,
  manual:  Globe,
}

const TYPE_LABELS: Record<string, string> = {
  bank:    'Bank Transfer',
  crypto:  'Cryptocurrency',
  ewallet: 'E-Wallet',
  manual:  'Manual',
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'NGN', 'JPY', 'CAD', 'AUD']

const schema = z.object({
  name:         z.string().min(2, 'Required').max(80),
  type:         z.enum(['bank', 'crypto', 'ewallet', 'manual']),
  is_active:    z.boolean(),
  logo_url:     z.string().optional(),
  instructions: z.string().min(10, 'Explain exactly how to pay (min 10 chars)'),
  // Key-value pairs for payment details
  detail_keys:  z.array(z.string()),
  detail_vals:  z.array(z.string()),
  currencies:   z.array(z.string()).min(1, 'Select at least one currency'),
  sort_order:   z.coerce.number().int().min(0),
})

type FormValues = z.infer<typeof schema>

function GatewayModal({ gateway, open, onClose }: {
  gateway: PaymentGateway | null; open: boolean; onClose: () => void
}) {
  const [isPending, start] = useTransition()
  const [pairs, setPairs]  = useState<Array<[string, string]>>(
    gateway ? Object.entries(gateway.details as Record<string, string>) : [['', '']]
  )

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name:         gateway?.name ?? '',
      type:         gateway?.type ?? 'bank',
      is_active:    gateway?.is_active ?? true,
      logo_url:     gateway?.logo_url ?? '',
      instructions: gateway?.instructions ?? '',
      detail_keys:  pairs.map(([k]) => k),
      detail_vals:  pairs.map(([, v]) => v),
      currencies:   gateway?.currencies ?? ['EUR', 'USD', 'GBP'],
      sort_order:   gateway?.sort_order ?? 0,
    },
  })

  const currencies = watch('currencies')

  function addPair() { setPairs(p => [...p, ['', '']]) }
  function removePair(i: number) { setPairs(p => p.filter((_, j) => j !== i)) }

  function onSubmit(values: FormValues) {
    const details: Record<string, string> = {}
    pairs.forEach(([k, v]) => { if (k.trim()) details[k.trim()] = v })

    start(async () => {
      try {
        const result = await upsertGateway({
        name:         values.name,
        type:         values.type,
        is_active:    values.is_active,
        logo_url:     values.logo_url,
        instructions: values.instructions,
        details,
        currencies:   values.currencies,
        sort_order:   values.sort_order,
        }, gateway?.id)
        if (!result?.success) { toast.error(result?.error); return }
        toast.success(gateway ? 'Gateway updated' : 'Gateway created')
        onClose()
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  if (!open) return null

  const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl z-10 mb-10">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">{gateway ? 'Edit gateway' : 'New payment gateway'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Name + type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs block mb-1.5">Gateway name</label>
              <input {...register('name')} placeholder="e.g. PayPal, Bitcoin" className={inputCls} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label-xs block mb-1.5">Type</label>
              <select {...register('type')} className={inputCls}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className="label-xs block mb-1.5">Logo URL <span className="normal-case font-normal">(direct image link)</span></label>
            <input {...register('logo_url')} placeholder="https://..." className={inputCls} />
            <p className="text-[11px] text-muted-foreground mt-1">Upload to Supabase Storage and paste the public URL, or use any image CDN link</p>
          </div>

          {/* Instructions */}
          <div>
            <label className="label-xs block mb-1.5">Payment instructions</label>
            <textarea {...register('instructions')} rows={4}
              placeholder={`e.g. Send payment to the PayPal address below. Include your deposit reference in the payment note.\n\nOnce sent, click "Mark as paid" and upload your payment screenshot.`}
              className={`${inputCls} resize-none`} />
            {errors.instructions && <p className="text-xs text-destructive mt-1">{errors.instructions.message}</p>}
          </div>

          {/* Payment details key-value */}
          <div>
            <label className="label-xs block mb-2">Payment details <span className="normal-case font-normal">(shown to user)</span></label>
            <div className="space-y-2">
              {pairs.map(([k, v], i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={k}
                    onChange={e => { const p = [...pairs]; p[i] = [e.target.value, p[i]?.[1] ?? '']; setPairs(p) }}
                    placeholder="Label (e.g. PayPal Email)"
                    className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm focus:outline-none"
                  />
                  <input
                    value={v}
                    onChange={e => { const p = [...pairs]; p[i] = [p[i]?.[0] ?? '', e.target.value]; setPairs(p) }}
                    placeholder="Value (e.g. payments@company.com)"
                    className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm focus:outline-none"
                  />
                  <button type="button" onClick={() => removePair(i)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addPair}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add detail field
              </button>
            </div>
          </div>

          {/* Currencies */}
          <div>
            <label className="label-xs block mb-2">Accepted currencies</label>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map(c => (
                <button key={c} type="button"
                  onClick={() => {
                    const cur = currencies.includes(c)
                      ? currencies.filter(x => x !== c)
                      : [...currencies, c]
                    setValue('currencies', cur)
                  }}
                  className={`font-mono text-xs px-2.5 py-1 rounded border transition-colors ${
                    currencies.includes(c)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {errors.currencies && <p className="text-xs text-destructive mt-1">{errors.currencies.message}</p>}
          </div>

          {/* Sort + active */}
          <div className="flex items-center gap-4">
            <div className="w-24">
              <label className="label-xs block mb-1.5">Sort order</label>
              <input {...register('sort_order')} type="number" min={0} className={inputCls} />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input {...register('is_active')} type="checkbox" id="is_active" className="w-4 h-4 accent-primary" />
              <label htmlFor="is_active" className="text-sm">Active (visible to users)</label>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {gateway ? 'Update gateway' : 'Create gateway'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function GatewaysClient({ initialGateways }: { initialGateways: PaymentGateway[] }) {
  const [gateways, setGateways] = useState(initialGateways)
  const [editing, setEditing]   = useState<PaymentGateway | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [, start] = useTransition()

  function handleDelete(id: string) {
    if (!confirm('Disable this gateway? Users will no longer see it.')) return
    start(async () => {
      try {
        const res = await deleteGateway(id)
        if (!res.success) { toast.error(res.error); return }
        setGateways(prev => prev.filter(g => g.id !== id))
        toast.success('Gateway disabled')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setModalOpen(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add gateway
        </button>
      </div>

      {gateways.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold mb-1">No payment gateways yet</p>
          <p className="text-sm text-muted-foreground mb-5">Add your first gateway so users can deposit funds</p>
          <button onClick={() => { setEditing(null); setModalOpen(true) }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add first gateway
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {gateways.map(gw => {
            const Icon = TYPE_ICONS[gw.type] ?? Globe
            const details = gw.details as Record<string, string>
            return (
              <div key={gw.id} className={`rounded-xl border p-5 transition-all ${gw.is_active ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {gw.logo_url ? (
                      <img src={gw.logo_url} alt={gw.name} className="w-10 h-10 rounded-xl object-contain border border-border bg-white p-1" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-sm">{gw.name}</p>
                      <p className="text-xs text-muted-foreground">{TYPE_LABELS[gw.type]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button onClick={() => { setEditing(gw); setModalOpen(true) }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(gw.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details preview */}
                <div className="space-y-1.5 mb-3">
                  {Object.entries(details).slice(0, 3).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono font-medium text-right max-w-[160px] truncate">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Currencies */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {gw.currencies.map(c => (
                    <span key={c} className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                  <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${gw.is_active ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                    {gw.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <GatewayModal
        gateway={editing}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
      />
    </div>
  )
}
