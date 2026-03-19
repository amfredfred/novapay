// app/[locale]/(superadmin)/system/_components/global-settings-form.tsx
'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { updateGlobalSettings } from '@/actions/superadmin'
import type { GlobalSettings } from '@/types'

const schema = z.object({
  supportEmail:          z.string().email(),
  minKycAmount:          z.coerce.number().int().positive(),
  maxLoginAttempts:      z.coerce.number().int().min(3).max(20),
  sessionTimeoutMinutes: z.coerce.number().int().min(5).max(1440),
  defaultCurrency:       z.enum(['EUR','USD','GBP','CHF','NGN','JPY','CAD','AUD']),
  maintenanceMode:       z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function GlobalSettingsForm({ settings }: { settings: GlobalSettings }) {
  const [isPending, start] = useTransition()

  const { register, control, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supportEmail:          settings.support_email,
      minKycAmount:          settings.min_kyc_amount,
      maxLoginAttempts:      settings.max_login_attempts,
      sessionTimeoutMinutes: settings.session_timeout_minutes,
      defaultCurrency:       settings.default_currency,
      maintenanceMode:       settings.maintenance_mode,
    },
  })

  function onSubmit(values: FormValues) {
    start(async () => {
      try {
        const result = await updateGlobalSettings(values)
        if (!result?.success) { toast.error('Save failed', { description: result?.error }); return }
        toast.success('Settings saved', { description: 'Propagated to all services' })
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Global settings</CardTitle>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isPending || !isDirty}
            size="sm"
            className="gap-2"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Support email</Label>
          <Input {...register('supportEmail')} type="email" />
          {errors.supportEmail && <p className="text-xs text-destructive">{errors.supportEmail.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Min KYC amount (EUR)</Label>
            <Input {...register('minKycAmount')} type="number" />
          </div>
          <div className="space-y-1.5">
            <Label>Default currency</Label>
            <Controller
              control={control}
              name="defaultCurrency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['EUR','USD','GBP','CHF','NGN','JPY','CAD','AUD'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Max login attempts</Label>
            <Input {...register('maxLoginAttempts')} type="number" min={3} max={20} />
          </div>
          <div className="space-y-1.5">
            <Label>Session timeout (min)</Label>
            <Input {...register('sessionTimeoutMinutes')} type="number" />
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Maintenance mode</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Blocks all non-admin API access
            </p>
          </div>
          <Controller
            control={control}
            name="maintenanceMode"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={(v) => {
                  field.onChange(v)
                  toast.warning(
                    v ? 'Maintenance mode is ON' : 'Maintenance mode turned off',
                    { description: v ? 'Remember to save' : undefined },
                  )
                }}
              />
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// app/[locale]/(superadmin)/system/_components/service-health-grid.tsx
// ─────────────────────────────────────────────────────────────────────────────
// (Co-located in same file for brevity — split in production)

const SERVICES = [
  { name: 'API Gateway',         status: 'ok',   latencyMs: 12,  uptimePct: 99.98 },
  { name: 'Auth service',        status: 'ok',   latencyMs: 8,   uptimePct: 100 },
  { name: 'Payment rail (SEPA)', status: 'ok',   latencyMs: 34,  uptimePct: 99.94 },
  { name: 'KYC provider',        status: 'ok',   latencyMs: 89,  uptimePct: 99.7 },
  { name: 'FX data feed',        status: 'warn', latencyMs: 210, uptimePct: 98.2 },
  { name: 'Fraud engine',        status: 'ok',   latencyMs: 44,  uptimePct: 99.99 },
  { name: 'Supabase Realtime',   status: 'ok',   latencyMs: 5,   uptimePct: 100 },
  { name: 'Edge Functions',      status: 'ok',   latencyMs: 22,  uptimePct: 99.95 },
] as const

import { Circle } from 'lucide-react'

export function ServiceHealthGrid() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Service health</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {SERVICES.map((svc) => (
          <div
            key={svc.name}
            className="flex items-center justify-between px-6 py-3"
          >
            <div className="flex items-center gap-2.5">
              <Circle
                className={`h-2.5 w-2.5 ${
                  svc.status === 'ok'   ? 'fill-emerald-500 text-emerald-500' :
                  svc.status === 'warn' ? 'fill-amber-500 text-amber-500'    :
                                         'fill-destructive text-destructive'
                }`}
              />
              <span className="text-sm">{svc.name}</span>
            </div>
            <div className="flex items-center gap-5 text-xs font-mono text-muted-foreground">
              <span>{svc.latencyMs}ms</span>
              <span className={
                svc.uptimePct >= 99.9 ? 'text-success font-medium' :
                svc.uptimePct >= 99   ? 'text-warning' :
                                        'text-destructive'
              }>
                {svc.uptimePct}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
