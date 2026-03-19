// app/[locale]/superadmin/history-generator/_components/history-generator-client.tsx
'use client'

import { useState, useTransition, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Zap, Download, RotateCcw, CalendarIcon, CheckCircle2,
  Loader2, AlertTriangle, Users, PlusCircle, Trash2,
  Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { generateTransactions } from '@/lib/utils/tx-generator'
import { importGeneratedTransactions } from '@/actions/superadmin'
import { getUserAccounts, generateAiTransactions, type UserAccount } from '@/actions/superadmin-queries'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import type { GeneratedTransaction, Currency, TxType } from '@/types'
import { TxTypeBadge } from '@/components/status-badge'

const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF', 'NGN', 'JPY', 'CAD', 'AUD']
const TX_TYPES: TxType[] = [
  'sepa_transfer', 'card_payment', 'atm_withdrawal', 'fx_exchange',
  'standing_order', 'direct_debit', 'salary', 'refund', 'fee', 'interest',
]

const schema = z.object({
  dateFrom:   z.date(),
  dateTo:     z.date(),
  currencies: z.array(z.string()).min(1),
  txTypes:    z.array(z.string()),
  minAmount:  z.coerce.number().min(0.01),
  maxAmount:  z.coerce.number().min(0.01),
  count:      z.number().int().min(1).max(500),
}).refine(d => d.dateFrom <= d.dateTo, { message: 'Start must be before end', path: ['dateTo'] })
  .refine(d => d.minAmount <= d.maxAmount, { message: 'Min must be ≤ max', path: ['maxAmount'] })

type FormValues = z.infer<typeof schema>

interface User { id: string; email: string; full_name: string | null }

function ChipToggle({ value, selected, onToggle, small }: {
  value: string; selected: boolean; onToggle: () => void; small?: boolean
}) {
  return (
    <button type="button" onClick={onToggle}
      className={[
        'rounded border transition-colors font-mono focus-visible:outline-none',
        small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:border-primary/50',
      ].join(' ')}>
      {value}
    </button>
  )
}

function ImportSuccess({ inserted, skipped, onReset }: {
  inserted: number; skipped: number; onReset: () => void
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1.5">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Import successful</p>
              <p className="text-xs text-muted-foreground">
                {inserted} inserted{skipped > 0 ? ` · ${skipped} skipped` : ''} · Audit log updated
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Generate again
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function HistoryGeneratorClient({ users }: { users: User[] }) {
  const [mode, setMode]                 = useState<'generate' | 'ai'>('generate')
  const [preview, setPreview]           = useState<GeneratedTransaction[]>([])
  const [targetUserId, setTargetUserId] = useState<string>('')
  const [targetAccountId, setTargetAccountId] = useState<string>('')
  const [accounts, setAccounts]         = useState<UserAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [showManual, setShowManual]     = useState(false)
  const [aiPrompt, setAiPrompt]         = useState('')
  const [aiLoading, setAiLoading]       = useState(false)
  const [manualRow, setManualRow]       = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '', type: 'card_payment' as TxType,
    amount: -50, currency: 'EUR' as Currency, merchant: '',
  })
  const [isPending, startTransition]    = useTransition()

  const { control, register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dateFrom: new Date(Date.now() - 90 * 86_400_000), dateTo: new Date(),
      currencies: ['EUR', 'USD'], txTypes: [], minAmount: 1, maxAmount: 5000, count: 100,
    },
  })
  const count = watch('count')

  // When user changes — load their accounts
  async function handleUserChange(userId: string) {
    setTargetUserId(userId)
    setTargetAccountId('')
    setAccounts([])
    if (!userId) return
    setLoadingAccounts(true)
    try {
      const accts = await getUserAccounts(userId)
      setAccounts(accts)
      if (accts.length === 1) setTargetAccountId(accts[0]!.id)
    } catch {
      toast.error('Failed to load user accounts')
    } finally {
      setLoadingAccounts(false)
    }
  }

  const onGenerate = useCallback((values: FormValues) => {
    const txs = generateTransactions({
      dateFrom: values.dateFrom, dateTo: values.dateTo,
      currencies: values.currencies as Currency[], types: values.txTypes as TxType[],
      minAmount: values.minAmount, maxAmount: values.maxAmount, count: values.count,
    })
    setPreview(txs)
    setImportResult(null)
  }, [])

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) { toast.error('Enter a prompt'); return }
    setAiLoading(true)
    try {
      const txs = await generateAiTransactions(aiPrompt)
      const mapped: GeneratedTransaction[] = txs.map(t => ({
        id: crypto.randomUUID(), date: t.date, description: t.description,
        amount: t.amount, currency: t.currency as Currency, type: t.type as TxType,
        merchant: t.merchant || undefined, category: 'AI Generated',
        reference: 'AI-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        metadata: { ai: true },
      }))
      setPreview(mapped)
      setImportResult(null)
      toast.success(`Generated ${mapped.length} AI transactions`)
    } catch (err) {
      toast.error('AI generation failed', { description: (err as Error).message })
    } finally {
      setAiLoading(false)
    }
  }

  const handleImport = useCallback(() => {
    if (!targetUserId) { toast.error('Select a user first'); return }
    if (!targetAccountId) { toast.error('Select an account first'); return }
    if (preview.length === 0) { toast.error('Generate a preview first'); return }
    startTransition(async () => {
      // Pass accountId override via metadata
      const result = await importGeneratedTransactions(targetUserId, preview.map(tx => ({
        ...tx, metadata: { ...tx.metadata, targetAccountId },
      })))
      if (!result.success) { toast.error('Import failed', { description: result.error }); return }
      setImportResult({ inserted: result.data.inserted, skipped: result.data.skipped })
      toast.success(`${result.data.inserted} transactions imported`)
    })
  }, [targetUserId, targetAccountId, preview])

  const handleReset = () => {
    reset(); setPreview([]); setImportResult(null)
    setTargetUserId(''); setTargetAccountId(''); setAccounts([])
  }

  const addManualRow = () => {
    if (!manualRow.description.trim()) { toast.error('Enter a description'); return }
    const tx: GeneratedTransaction = {
      id: crypto.randomUUID(), date: new Date(manualRow.date).toISOString(),
      description: manualRow.description.trim(), type: manualRow.type,
      amount: manualRow.amount, currency: manualRow.currency,
      merchant: manualRow.merchant || undefined, category: 'Manual',
      reference: 'MANUAL-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      metadata: { manual: true },
    }
    setPreview(prev => [tx, ...prev])
    setManualRow(r => ({ ...r, description: '', merchant: '' }))
    toast.success('Row added')
  }

  const removeRow = (id: string) => setPreview(prev => prev.filter(t => t.id !== id))

  const inputCls = 'h-8 text-sm border-border bg-background'

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">

      {/* ── LEFT: Settings ── */}
      <Card className="sticky top-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setMode('generate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${mode === 'generate' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Zap className="h-3.5 w-3.5" /> Generator
            </button>
            <button onClick={() => setMode('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${mode === 'ai' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Sparkles className="h-3.5 w-3.5" /> AI (DeepSeek)
            </button>
          </div>
          <CardTitle className="text-sm">{mode === 'ai' ? 'AI Transaction Generator' : 'Generator Settings'}</CardTitle>
          <CardDescription className="text-xs">
            {mode === 'ai'
              ? 'Describe the transaction history you want in plain English'
              : 'Configure synthetic transaction parameters'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === 'ai' ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Prompt</Label>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder={`e.g. "Generate 20 realistic transactions for a London freelance designer over the last 3 months. Mix of Spotify, Tesco, client salary payments, and Uber rides in GBP."`}
                  rows={6}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <Button onClick={handleAiGenerate} disabled={aiLoading} className="w-full gap-2">
                {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate with AI</>}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Uses DeepSeek Chat · Requires <code className="font-mono">DEEPSEEK_API_KEY</code>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onGenerate)} className="space-y-5">
              {/* Date range */}
              <div className="grid grid-cols-2 gap-2">
                {(['dateFrom', 'dateTo'] as const).map((field, i) => (
                  <div key={field}>
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                      {i === 0 ? 'From' : 'To'}
                    </Label>
                    <Controller control={control} name={field} render={({ field: f }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-start text-xs font-normal h-8">
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            {f.value ? format(f.value, 'dd MMM yy') : 'Pick date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={f.value} onSelect={d => d && f.onChange(d)} initialFocus />
                        </PopoverContent>
                      </Popover>
                    )} />
                  </div>
                ))}
              </div>

              {/* Currencies */}
              <Controller control={control} name="currencies" render={({ field: f }) => (
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Currencies</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {CURRENCIES.map(c => (
                      <ChipToggle key={c} value={c} small
                        selected={f.value.includes(c)}
                        onToggle={() => f.onChange(f.value.includes(c) ? f.value.filter(x => x !== c) : [...f.value, c])} />
                    ))}
                  </div>
                </div>
              )} />

              {/* Types */}
              <Controller control={control} name="txTypes" render={({ field: f }) => (
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                    Types <span className="normal-case font-normal">(empty = all)</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {TX_TYPES.map(t => (
                      <ChipToggle key={t} value={t.replace(/_/g, ' ')} small
                        selected={f.value.includes(t)}
                        onToggle={() => f.onChange(f.value.includes(t) ? f.value.filter(x => x !== t) : [...f.value, t])} />
                    ))}
                  </div>
                </div>
              )} />

              {/* Amount range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Min €</Label>
                  <Input {...register('minAmount')} type="number" step="1" className={inputCls} />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Max €</Label>
                  <Input {...register('maxAmount')} type="number" step="1" className={inputCls} />
                </div>
              </div>

              {/* Count */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Count</Label>
                  <span className="font-mono text-sm font-semibold tabular-nums">{count}</span>
                </div>
                <Controller control={control} name="count" render={({ field: f }) => (
                  <Slider min={1} max={500} step={1} value={[f.value]}
                    onValueChange={([v]) => f.onChange(v ?? 100)} className="py-1" />
                )} />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" className="flex-1 gap-2">
                  <Zap className="h-4 w-4" /> Generate preview
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={handleReset} title="Reset">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── RIGHT: Preview + Import ── */}
      <div className="space-y-4 min-h-[560px] flex flex-col">

        {preview.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center gap-3 min-h-[480px] p-8">
            <div className="rounded-full bg-muted p-4">
              <Zap className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">No preview generated</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Configure parameters and click <span className="font-semibold">Generate preview</span>,
                or use the <span className="font-semibold">AI</span> tab
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="font-mono">{preview.length} rows</Badge>
              {[...new Set(preview.map(t => t.currency))].map(c => (
                <Badge key={c} variant="outline" className="font-mono text-[10px]">{c}</Badge>
              ))}
              <div className="ml-auto flex gap-4 text-xs text-muted-foreground font-mono">
                <span className="text-green-600 font-semibold">
                  +{preview.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0).toFixed(2)}
                </span>
                <span>{preview.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-hidden rounded-xl border border-border">
              <div className="h-[360px] overflow-y-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 label-xs">Date</th>
                      <th className="text-left px-3 py-2 label-xs">Description</th>
                      <th className="text-left px-3 py-2 label-xs">Type</th>
                      <th className="text-right px-3 py-2 label-xs">Amount</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.map(tx => (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-sm max-w-[200px] truncate">{tx.description}</td>
                        <td className="px-3 py-2"><TxTypeBadge type={tx.type} /></td>
                        <td className="px-3 py-2 text-right font-mono text-sm font-semibold">
                          <span className={tx.amount > 0 ? 'text-green-600' : ''}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} {tx.currency}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeRow(tx.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual row entry */}
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3">
              <button type="button" onClick={() => setShowManual(v => !v)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                <PlusCircle className="h-3.5 w-3.5" />
                Add transaction manually
                {showManual ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
              </button>
              {showManual && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div><label className="label-xs block mb-1">Date</label>
                    <input type="date" value={manualRow.date}
                      onChange={e => setManualRow(r => ({ ...r, date: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background focus:outline-none" />
                  </div>
                  <div className="col-span-2"><label className="label-xs block mb-1">Description</label>
                    <input type="text" value={manualRow.description} placeholder="e.g. Salary payment"
                      onChange={e => setManualRow(r => ({ ...r, description: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background focus:outline-none" />
                  </div>
                  <div><label className="label-xs block mb-1">Type</label>
                    <select value={manualRow.type} onChange={e => setManualRow(r => ({ ...r, type: e.target.value as TxType }))}
                      className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background focus:outline-none">
                      {TX_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div><label className="label-xs block mb-1">Amount (−=debit)</label>
                    <input type="number" step="0.01" value={manualRow.amount}
                      onChange={e => setManualRow(r => ({ ...r, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background font-mono focus:outline-none" />
                  </div>
                  <div><label className="label-xs block mb-1">Currency</label>
                    <select value={manualRow.currency} onChange={e => setManualRow(r => ({ ...r, currency: e.target.value as Currency }))}
                      className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background focus:outline-none">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-3 flex justify-end mt-1">
                    <button type="button" onClick={addManualRow}
                      className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded hover:bg-primary/90 transition-colors">
                      <PlusCircle className="h-3.5 w-3.5" /> Add to preview
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Target: user → account */}
            {importResult ? (
              <ImportSuccess {...importResult} onReset={handleReset} />
            ) : (
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Import target
                  </p>

                  {/* Step 1: User */}
                  <div>
                    <Label className="label-xs mb-1.5 block">1. Select user</Label>
                    <Select value={targetUserId} onValueChange={handleUserChange}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Search users…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[260px]">
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            <span className="font-medium">{u.full_name ?? 'Unnamed'}</span>
                            <span className="ml-2 text-xs text-muted-foreground font-mono">{u.email}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 2: Account */}
                  {targetUserId && (
                    <div>
                      <Label className="label-xs mb-1.5 block">2. Select account</Label>
                      {loadingAccounts ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading accounts…
                        </div>
                      ) : accounts.length === 0 ? (
                        <p className="text-xs text-amber-600 flex items-center gap-1.5 py-2">
                          <AlertTriangle className="h-3.5 w-3.5" /> No active accounts found for this user
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {accounts.map(acct => (
                            <button key={acct.id} type="button"
                              onClick={() => setTargetAccountId(acct.id)}
                              className={`flex flex-col items-center p-2.5 rounded border text-xs transition-all ${
                                targetAccountId === acct.id
                                  ? 'bg-primary/10 border-primary text-primary font-semibold'
                                  : 'border-border hover:border-primary/50 text-muted-foreground'
                              }`}>
                              <span className="font-mono font-bold text-sm">{acct.currency}</span>
                              <span className="mt-0.5 text-[10px] truncate w-full text-center">
                                {formatCurrency(acct.balance, acct.currency as Currency)}
                              </span>
                              {acct.is_primary && (
                                <span className="mt-1 text-[9px] bg-primary/20 text-primary px-1 py-0.5 rounded">primary</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Import button */}
                  <Button
                    onClick={handleImport}
                    disabled={isPending || !targetUserId || !targetAccountId}
                    className="w-full gap-2"
                  >
                    {isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                      : <><Download className="h-4 w-4" /> Import {preview.length} transactions</>
                    }
                  </Button>
                  {(!targetUserId || !targetAccountId) && (
                    <p className="text-xs text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {!targetUserId ? 'Select a user' : 'Select an account'} before importing
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
