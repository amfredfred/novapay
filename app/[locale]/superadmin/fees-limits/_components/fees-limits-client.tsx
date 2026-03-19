// app/[locale]/(superadmin)/fees-limits/_components/fees-limits-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'

interface Product {
  id:               string
  name:             string
  type:             string
  tx_limit_daily:   number
  tx_limit_monthly: number
}

interface FeeRow {
  id:            string
  product_id:    string
  fee_type:      string
  amount:        number
  is_percentage: boolean
}

interface Props {
  products: Product[]
  fees:     FeeRow[]
}

// Helper to look up a fee amount for a product/type
function getFee(fees: FeeRow[], productId: string, feeType: string): number {
  return fees.find((f) => f.product_id === productId && f.fee_type === feeType)?.amount ?? 0
}

function EditableCell({
  value,
  suffix,
  onChange,
}: {
  value:    number
  suffix?:  string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1.5 max-w-[120px]">
      <Input
        type="number"
        step="0.01"
        defaultValue={value}
        className="h-8 text-sm font-mono w-24"
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
      {suffix && (
        <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>
      )}
    </div>
  )
}

// ── SEPA Fees Tab ─────────────────────────────────────────────────────────────

function SepaTab({ products, fees }: { products: Product[]; fees: FeeRow[] }) {
  const [isPending, start] = useTransition()
  const [edits, setEdits]  = useState<Record<string, Record<string, number>>>({})

  function setEdit(productId: string, field: string, value: number) {
    setEdits((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }))
  }

  async function save() {
    start(async () => {
      try {
        const supabase = createClient()
        const upserts = products.flatMap((p) => {
        const e = edits[p.id] ?? {}
        return [
          { product_id: p.id, fee_type: 'sepa_domestic',  amount: e['sepa_domestic']  ?? getFee(fees, p.id, 'sepa_domestic'),  is_percentage: false },
          { product_id: p.id, fee_type: 'sepa_intra_eu',  amount: e['sepa_intra_eu']  ?? getFee(fees, p.id, 'sepa_intra_eu'),  is_percentage: false },
          { product_id: p.id, fee_type: 'sepa_intl',      amount: e['sepa_intl']      ?? getFee(fees, p.id, 'sepa_intl'),      is_percentage: false },
        ]
        })
        const { error } = await supabase
        .from('product_fees')
        .upsert(upserts, { onConflict: 'product_id,fee_type' })

        if (error) { toast.error('Save failed', { description: error.message }); return }
        toast.success('SEPA fees updated', { description: 'Changes propagated to all accounts' })
        setEdits({})
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Flat-fee transfers in EUR. Set 0 for free.
        </p>
        <Button size="sm" onClick={save} disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save SEPA fees
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs uppercase tracking-wider">Product</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Domestic (EUR)</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Intra-EU (EUR)</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">International (EUR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">
                      {p.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={getFee(fees, p.id, 'sepa_domestic')}
                    suffix="€"
                    onChange={(v) => setEdit(p.id, 'sepa_domestic', v)}
                  />
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={getFee(fees, p.id, 'sepa_intra_eu')}
                    suffix="€"
                    onChange={(v) => setEdit(p.id, 'sepa_intra_eu', v)}
                  />
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={getFee(fees, p.id, 'sepa_intl')}
                    suffix="€"
                    onChange={(v) => setEdit(p.id, 'sepa_intl', v)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── FX Markup Tab ─────────────────────────────────────────────────────────────

function FxTab({ products, fees }: { products: Product[]; fees: FeeRow[] }) {
  const [isPending, start] = useTransition()
  const [edits, setEdits]  = useState<Record<string, Record<string, number>>>({})

  function setEdit(productId: string, field: string, value: number) {
    setEdits((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }))
  }

  async function save() {
    start(async () => {
      try {
        const supabase = createClient()
        const upserts = products.flatMap((p) => {
        const e = edits[p.id] ?? {}
        return [
          { product_id: p.id, fee_type: 'fx_markup',      amount: e['fx_markup']      ?? getFee(fees, p.id, 'fx_markup'),      is_percentage: true },
          { product_id: p.id, fee_type: 'fx_spot_spread',  amount: e['fx_spot_spread'] ?? getFee(fees, p.id, 'fx_spot_spread'), is_percentage: true },
        ]
        })
        const { error } = await supabase
        .from('product_fees')
        .upsert(upserts, { onConflict: 'product_id,fee_type' })

        if (error) { toast.error('Save failed', { description: error.message }); return }
        toast.success('FX fees updated')
        setEdits({})
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Applied on top of mid-market rate. Total = markup + spot spread.
        </p>
        <Button size="sm" onClick={save} disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save FX fees
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs uppercase tracking-wider">Product</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">FX markup (%)</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Spot spread (%)</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Effective total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const markup = (edits[p.id]?.['fx_markup']      ?? getFee(fees, p.id, 'fx_markup'))
              const spread = (edits[p.id]?.['fx_spot_spread']  ?? getFee(fees, p.id, 'fx_spot_spread'))
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{p.name}</p>
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={getFee(fees, p.id, 'fx_markup')}
                      suffix="%"
                      onChange={(v) => setEdit(p.id, 'fx_markup', v)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={getFee(fees, p.id, 'fx_spot_spread')}
                      suffix="%"
                      onChange={(v) => setEdit(p.id, 'fx_spot_spread', v)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {(markup + spread).toFixed(2)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── ATM Fees Tab ──────────────────────────────────────────────────────────────

function AtmTab({ products, fees }: { products: Product[]; fees: FeeRow[] }) {
  const [isPending, start] = useTransition()
  const [edits, setEdits]  = useState<Record<string, Record<string, number>>>({})

  function setEdit(productId: string, field: string, value: number) {
    setEdits((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }))
  }

  async function save() {
    start(async () => {
      try {
        const supabase = createClient()
        const upserts = products.flatMap((p) => {
        const e = edits[p.id] ?? {}
        return [
          { product_id: p.id, fee_type: 'atm_free_per_month', amount: e['atm_free']    ?? getFee(fees, p.id, 'atm_free_per_month'), is_percentage: false },
          { product_id: p.id, fee_type: 'atm_fee',            amount: e['atm_fee']     ?? getFee(fees, p.id, 'atm_fee'),            is_percentage: false },
          { product_id: p.id, fee_type: 'atm_max_per_day',    amount: e['atm_max_day'] ?? getFee(fees, p.id, 'atm_max_per_day'),    is_percentage: false },
        ]
        })
        const { error } = await supabase
        .from('product_fees')
        .upsert(upserts, { onConflict: 'product_id,fee_type' })

        if (error) { toast.error('Save failed', { description: error.message }); return }
        toast.success('ATM fees updated')
        setEdits({})
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Free withdrawals per calendar month, then per-withdrawal fee applies.
        </p>
        <Button size="sm" onClick={save} disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save ATM fees
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs uppercase tracking-wider">Product</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Free / month</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Fee after free (€)</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Max per day (€)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <p className="font-medium text-sm">{p.name}</p>
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={getFee(fees, p.id, 'atm_free_per_month')}
                    onChange={(v) => setEdit(p.id, 'atm_free', v)}
                  />
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={getFee(fees, p.id, 'atm_fee')}
                    suffix="€"
                    onChange={(v) => setEdit(p.id, 'atm_fee', v)}
                  />
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={getFee(fees, p.id, 'atm_max_per_day')}
                    suffix="€"
                    onChange={(v) => setEdit(p.id, 'atm_max_day', v)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── Limits Tab ────────────────────────────────────────────────────────────────

function LimitsTab({ products }: { products: Product[] }) {
  const [isPending, start] = useTransition()
  type LimitEdits = Record<string, { daily?: number; monthly?: number }>
  const [edits, setEdits] = useState<LimitEdits>({})

  function setEdit(productId: string, field: 'daily' | 'monthly', value: number) {
    setEdits((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }))
  }

  async function save() {
    start(async () => {
      try {
        const supabase = createClient()
        const updates = Object.entries(edits).map(([id, e]) => ({
        id,
        tx_limit_daily:   e.daily   ?? products.find((p) => p.id === id)?.tx_limit_daily   ?? 0,
        tx_limit_monthly: e.monthly ?? products.find((p) => p.id === id)?.tx_limit_monthly ?? 0,
        }))

        for (const u of updates) {
        const { error } = await supabase
          .from('products')
          .update({ tx_limit_daily: u.tx_limit_daily, tx_limit_monthly: u.tx_limit_monthly })
          .eq('id', u.id)
        if (error) { toast.error('Save failed', { description: error.message }); return }
        }

        toast.success('Limits updated')
        setEdits({})
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Maximum transaction values in EUR equivalent per product tier.
        </p>
        <Button size="sm" onClick={save} disabled={isPending || Object.keys(edits).length === 0} className="gap-2">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save limits
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs uppercase tracking-wider">Product</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Daily limit (EUR)</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Monthly limit (EUR)</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Monthly / Daily ratio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const daily   = edits[p.id]?.daily   ?? p.tx_limit_daily
              const monthly = edits[p.id]?.monthly ?? p.tx_limit_monthly
              const ratio   = monthly > 0 ? (monthly / daily).toFixed(1) : '—'
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">
                        {p.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={p.tx_limit_daily}
                      suffix="€"
                      onChange={(v) => setEdit(p.id, 'daily', v)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={p.tx_limit_monthly}
                      suffix="€"
                      onChange={(v) => setEdit(p.id, 'monthly', v)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-muted-foreground">{ratio}×</span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function FeesLimitsClient({ products, fees }: Props) {
  return (
    <Tabs defaultValue="sepa" className="space-y-6">
      <TabsList className="grid grid-cols-4 w-fit">
        <TabsTrigger value="sepa">SEPA fees</TabsTrigger>
        <TabsTrigger value="fx">FX markup</TabsTrigger>
        <TabsTrigger value="atm">ATM fees</TabsTrigger>
        <TabsTrigger value="limits">TX limits</TabsTrigger>
      </TabsList>

      <TabsContent value="sepa">
        <Card><CardContent className="pt-6">
          <SepaTab products={products} fees={fees} />
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="fx">
        <Card><CardContent className="pt-6">
          <FxTab products={products} fees={fees} />
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="atm">
        <Card><CardContent className="pt-6">
          <AtmTab products={products} fees={fees} />
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="limits">
        <Card><CardContent className="pt-6">
          <LimitsTab products={products} />
        </CardContent></Card>
      </TabsContent>
    </Tabs>
  )
}
