// app/[locale]/(superadmin)/products/_components/products-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import { CurrencyBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { upsertProduct } from '@/actions/superadmin'
import type { ProductRow, ProductFormValues, Currency } from '@/types'

const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF', 'NGN', 'JPY', 'CAD', 'AUD']

const productSchema = z.object({
  name:                z.string().min(2).max(100),
  type:                z.enum(['current_account', 'savings', 'credit_card', 'debit_card']),
  supportedCurrencies: z.array(z.string()).min(1, 'Select at least one currency'),
  monthlyFee:          z.coerce.number().min(0),
  feeCurrency:         z.string(),
  txLimitDaily:        z.coerce.number().int().positive(),
  txLimitMonthly:      z.coerce.number().int().positive(),
  interestRate:        z.coerce.number().nullable(),
  eligibleCountries:   z.string().transform((s) =>
    s.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
  ),
  isActive: z.boolean(),
})

type FormRaw = z.input<typeof productSchema>

// ── Columns ───────────────────────────────────────────────────────────────────

function buildColumns(
  onEdit:   (p: ProductRow) => void,
  onToggle: (id: string, active: boolean) => void,
): ColumnDef<ProductRow>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 90,
      cell: ({ getValue }) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {(getValue() as string).slice(0, 8)}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      size: 140,
      cell: ({ getValue }) => (
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          {(getValue() as string).replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'supported_currencies',
      header: 'Currencies',
      size: 200,
      enableSorting: false,
      cell: ({ getValue }) => (
        <div className="flex flex-wrap gap-1">
          {(getValue() as string[]).map((c) => <CurrencyBadge key={c} currency={c} />)}
        </div>
      ),
    },
    {
      accessorKey: 'monthly_fee',
      header: 'Monthly fee',
      size: 110,
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.monthly_fee === 0
            ? <Badge variant="secondary">Free</Badge>
            : `€${row.original.monthly_fee.toFixed(2)}`}
        </span>
      ),
    },
    {
      accessorKey: 'tx_limit_monthly',
      header: 'Monthly limit',
      size: 120,
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">
          €{((getValue() as number) / 1000).toFixed(0)}k
        </span>
      ),
    },
    {
      accessorKey: 'interest_rate',
      header: 'Interest',
      size: 90,
      cell: ({ getValue }) => {
        const v = getValue() as number | null
        return <span className="font-mono text-sm">{v !== null ? `${v}%` : '—'}</span>
      },
    },
    {
      accessorKey: 'eligible_countries',
      header: 'Countries',
      size: 90,
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {(getValue() as string[]).length}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Active',
      size: 70,
      enableSorting: false,
      cell: ({ row }) => (
        <Switch
          checked={row.original.is_active}
          onCheckedChange={(v) => onToggle(row.original.id, v)}
        />
      ),
    },
    {
      id: 'actions',
      size: 60,
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row.original)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]
}

// ── Product modal ─────────────────────────────────────────────────────────────

function ProductModal({
  product,
  open,
  onClose,
  onSaved,
}: {
  product: ProductRow | null
  open: boolean
  onClose: () => void
  onSaved: (p: ProductRow) => void
}) {
  const [isPending, startTransition] = useTransition()

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormRaw>({
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      name:                product?.name ?? '',
      type:                product?.type ?? 'current_account',
      supportedCurrencies: product?.supported_currencies ?? ['EUR'],
      monthlyFee:          product?.monthly_fee ?? 0,
      feeCurrency:         product?.fee_currency ?? 'EUR',
      txLimitDaily:        product?.tx_limit_daily ?? 5000,
      txLimitMonthly:      product?.tx_limit_monthly ?? 50000,
      interestRate:        product?.interest_rate ?? null,
      eligibleCountries:   (product?.eligible_countries ?? []).join(', '),
      isActive:            product?.is_active ?? true,
    },
  })

  function onSubmit(raw: FormRaw) {
    const parsed = productSchema.parse(raw)
    startTransition(async () => {
      const result = await upsertProduct(parsed as ProductFormValues, product?.id)
      if (!result?.success) {
        toast.error('Failed to save product', { description: result?.error })
        return
      }
      toast.success(product ? 'Product updated' : 'Product created')
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'New product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Product name</Label>
            <Input {...register('name')} placeholder="e.g. NovaPay Premium" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_account">Current account</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="debit_card">Debit card</SelectItem>
                      <SelectItem value="credit_card">Credit card</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly fee (EUR)</Label>
              <Input type="number" step="0.01" {...register('monthlyFee')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Supported currencies</Label>
            <Controller
              control={control}
              name="supportedCurrencies"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        field.onChange(
                          field.value.includes(c)
                            ? field.value.filter((v) => v !== c)
                            : [...field.value, c],
                        )
                      }
                      className={[
                        'rounded-full border px-2.5 py-1 text-[11px] font-mono font-medium transition-colors',
                        field.value.includes(c)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50',
                      ].join(' ')}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Daily TX limit (EUR)</Label>
              <Input type="number" {...register('txLimitDaily')} />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly TX limit (EUR)</Label>
              <Input type="number" {...register('txLimitMonthly')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Interest rate (% p.a.)</Label>
              <Input type="number" step="0.1" placeholder="—" {...register('interestRate')} />
            </div>
            <div className="space-y-1.5">
              <Label>Fee currency</Label>
              <Controller
                control={control}
                name="feeCurrency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Eligible countries (ISO-2, comma-separated)</Label>
            <Input {...register('eligibleCountries')} placeholder="DE, FR, GB, ES…" />
          </div>

          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label>Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {product ? 'Update product' : 'Create product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ProductsClient({ initialProducts }: { initialProducts: ProductRow[] }) {
  const [products, setProducts]   = useState(initialProducts)
  const [editing, setEditing]     = useState<ProductRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isPending, start]        = useTransition()

  function handleToggle(id: string, active: boolean) {
    start(async () => {
      try {
        const product = products.find((p) => p.id === id)
        if (!product) return
        const result = await upsertProduct(
        {
          name:               product.name,
          type:               product.type,
          supportedCurrencies: product.supported_currencies as Currency[],
          monthlyFee:         product.monthly_fee,
          feeCurrency:        product.fee_currency as Currency,
          txLimitDaily:       product.tx_limit_daily,
          txLimitMonthly:     product.tx_limit_monthly,
          interestRate:       product.interest_rate,
          eligibleCountries:  product.eligible_countries,
          isActive:           active,
        },
        id,
        )
        if (!result?.success) { toast.error(result?.error); return }
        setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: active } : p)),
        )
        toast.success(`${product.name} ${active ? 'activated' : 'deactivated'}`)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  const columns = buildColumns(
    (p) => { setEditing(p); setModalOpen(true) },
    handleToggle,
  )

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {products.filter((p) => p.is_active).length} active ·{' '}
          {products.filter((p) => !p.is_active).length} inactive
        </p>
        <Button className="gap-2" onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={products}
        isLoading={isPending}
        emptyMessage="No products found."
      />

      <ProductModal
        product={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(p) => {
          setProducts((prev) =>
            editing ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev],
          )
          setModalOpen(false)
        }}
      />
    </>
  )
}
