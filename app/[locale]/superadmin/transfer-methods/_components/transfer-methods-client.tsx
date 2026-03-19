'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Loader2, Send, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { createAdminClient } from '@/lib/supabase/client'

// Inline server actions via admin client (superadmin only page)
async function upsert(data: any, id?: string) {
  const res = await fetch('/api/transfer-methods', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, id }),
  })
  if (!res.ok) throw new Error(await res.text())
}

const TYPE_LABELS: Record<string, string> = {
  iban: 'SEPA / Bank Transfer', crypto: 'Cryptocurrency',
  paypal: 'PayPal', mobile_money: 'Mobile Money',
  internal: 'NovaPay Internal', custom: 'Custom',
}
const CURRENCIES = ['EUR','USD','GBP','CHF','NGN','JPY','CAD','AUD']

interface FieldDef { key: string; label: string; placeholder: string; required: boolean }
interface Method   { id: string; name: string; type: string; instructions: string; fields: FieldDef[]; currencies: string[]; is_active: boolean; sort_order: number }

function MethodModal({ method, onClose, onSave }: {
  method: Method | null; onClose: () => void; onSave: (m: Method) => void
}) {
  const [form, setForm]   = useState<Partial<Method>>(method ?? { type: 'iban', is_active: true, sort_order: 0, currencies: ['EUR','USD','GBP'], fields: [] })
  const [fields, setFields] = useState<FieldDef[]>(method?.fields ?? [])
  const [isPending, start]  = useTransition()
  const cls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30'

  function addField() { setFields(f => [...f, { key: '', label: '', placeholder: '', required: true }]) }
  function updateField(i: number, k: keyof FieldDef, v: any) {
    setFields(f => f.map((x, j) => j === i ? { ...x, [k]: v } : x))
  }
  function removeField(i: number) { setFields(f => f.filter((_, j) => j !== i)) }

  function save() {
    if (!form.name?.trim()) { toast.error('Name required'); return }
    start(async () => {
      try {
        const payload = { ...form, fields, currencies: form.currencies ?? [] }
        // Use supabase directly since we need server-side for actual save
        // For now we call the parent to handle via server action
        onSave(payload as Method)
        onClose()
      } catch (e: any) { toast.error(e.message) }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg z-10 mb-10">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">{method ? 'Edit method' : 'New transfer method'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs block mb-1.5">Name</label>
              <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={cls} placeholder="e.g. Bank Transfer" />
            </div>
            <div>
              <label className="label-xs block mb-1.5">Type</label>
              <select value={form.type ?? 'iban'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={cls}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label-xs block mb-1.5">Instructions (shown to user)</label>
            <textarea value={form.instructions ?? ''} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              rows={3} className={`${cls} resize-none`} placeholder="How to complete this transfer…" />
          </div>

          <div>
            <label className="label-xs block mb-2">Input fields</label>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input value={f.key} onChange={e => updateField(i, 'key', e.target.value)}
                    placeholder="key (e.g. iban)" className="px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
                  <input value={f.label} onChange={e => updateField(i, 'label', e.target.value)}
                    placeholder="Label (e.g. IBAN)" className="px-2 py-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none" />
                  <button onClick={() => removeField(i)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button onClick={addField} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80">
                <Plus className="h-3.5 w-3.5" /> Add field
              </button>
            </div>
          </div>

          <div>
            <label className="label-xs block mb-2">Accepted currencies</label>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, currencies: (f.currencies ?? []).includes(c) ? (f.currencies ?? []).filter(x => x !== c) : [...(f.currencies ?? []), c] }))}
                  className={`font-mono text-xs px-2.5 py-1 rounded border transition-colors ${(form.currencies ?? []).includes(c) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-20">
              <label className="label-xs block mb-1.5">Sort order</label>
              <input type="number" value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className={cls} />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="active" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-primary" />
              <label htmlFor="active" className="text-sm text-foreground">Active</label>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button onClick={save} disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {method ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TransferMethodsClient({ initialMethods }: { initialMethods: Method[] }) {
  const [methods, setMethods] = useState(initialMethods)
  const [editing, setEditing] = useState<Method | null>(null)
  const [open, setOpen]       = useState(false)
  const [, start]             = useTransition()

  async function handleSave(data: Method) {
    // Call server action
    const { upsertTransferMethod } = await import('@/actions/superadmin')
    const result = await (upsertTransferMethod as any)(data, data.id)
    if (result?.success === false) { toast.error(result.error); return }
    if (data.id) {
      setMethods(m => m.map(x => x.id === data.id ? { ...x, ...data } : x))
      toast.success('Method updated')
    } else {
      toast.success('Method created')
      // Refresh to get the new id
      window.location.reload()
    }
  }

  async function handleToggle(id: string, active: boolean) {
    const { upsertTransferMethod } = await import('@/actions/superadmin')
    const m = methods.find(x => x.id === id)!
    await (upsertTransferMethod as any)({ ...m, is_active: !active }, id)
    setMethods(ms => ms.map(x => x.id === id ? { ...x, is_active: !active } : x))
    toast.success(active ? 'Method disabled' : 'Method enabled')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setOpen(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add method
        </button>
      </div>

      {methods.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Send className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold mb-1">No transfer methods</p>
          <p className="text-sm text-muted-foreground">Add methods to enable client-side transfers</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {methods.map(m => (
            <div key={m.id} className={`rounded-xl border p-5 transition-all ${m.is_active ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{TYPE_LABELS[m.type] ?? m.type}</p>
                </div>
                <div className="flex gap-1.5 ml-2">
                  <button onClick={() => { setEditing(m); setOpen(true) }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleToggle(m.id, m.is_active)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors ${m.is_active ? 'border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30' : 'border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30'}`}>
                    {m.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{m.instructions}</p>
              <div className="flex gap-1.5 flex-wrap">
                {m.currencies.map(c => <span key={c} className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{c}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <MethodModal
          method={editing}
          onClose={() => { setOpen(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
