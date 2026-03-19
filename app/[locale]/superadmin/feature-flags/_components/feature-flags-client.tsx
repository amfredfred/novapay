// app/[locale]/superadmin/feature-flags/_components/feature-flags-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Pencil, Loader2, Zap, Users, Tag,
  CheckCircle2, XCircle, ChevronRight,
} from 'lucide-react'
import { upsertFeatureFlag } from '@/actions/superadmin'
import type { FeatureFlagRow, FlagFormValues } from '@/types'

const flagSchema = z.object({
  name:        z.string().regex(/^[a-z][a-z0-9_]*$/, 'Use snake_case (e.g. new_checkout_flow)').min(3).max(60),
  description: z.string().min(5, 'Describe what this flag controls').max(255),
  enabled:     z.boolean(),
  rolloutPct:  z.number().int().min(0).max(100),
  tagsRaw:     z.string().optional(),
})
type FormValues = z.infer<typeof flagSchema>

// ── Flag Modal ────────────────────────────────────────────────────────────────

function FlagModal({ flag, open, onClose }: {
  flag: FeatureFlagRow | null; open: boolean; onClose: () => void
}) {
  const [isPending, start] = useTransition()
  const { register, control, watch, handleSubmit, formState: { errors } } = useForm<FormValues>({
    values: {
      name:        flag?.name ?? '',
      description: flag?.description ?? '',
      enabled:     flag?.enabled ?? true,
      rolloutPct:  flag?.rollout_pct ?? 100,
      tagsRaw:     flag?.target_tags.join(', ') ?? '',
    },
  })
  const rollout = watch('rolloutPct')
  const enabled = watch('enabled')

  function onSubmit(values: FormValues) {
    const payload: FlagFormValues = {
      name: values.name, description: values.description,
      enabled: values.enabled, rolloutPct: values.rolloutPct,
      targetTags: (values.tagsRaw ?? '').split(',').map(t => t.trim()).filter(Boolean),
    }
    start(async () => {
      try {
        const result = await upsertFeatureFlag(payload, flag?.id)
        if (!result?.success) { toast.error(result?.error); return }
        toast.success(flag ? 'Flag updated' : 'Flag created')
        onClose()
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 z-10">
        <h2 className="text-base font-semibold mb-5">{flag ? 'Edit flag' : 'New feature flag'}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="label-xs block mb-1.5">Flag name</label>
            <input {...register('name')} disabled={!!flag} placeholder="e.g. new_checkout_flow"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label-xs block mb-1.5">Description — what does this flag control?</label>
            <input {...register('description')} placeholder="e.g. Enables the new onboarding funnel for beta users"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          {/* Enabled toggle */}
          <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${enabled ? 'border-green-500/40 bg-green-500/5' : 'border-border'}`}>
            <div>
              <p className="text-sm font-medium">{enabled ? 'Flag is enabled' : 'Flag is disabled'}</p>
              <p className="text-xs text-muted-foreground">{enabled ? 'Active for the rollout percentage below' : 'No users will see this flag'}</p>
            </div>
            <Controller control={control} name="enabled" render={({ field }) => (
              <button type="button" onClick={() => field.onChange(!field.value)}
                className={`w-11 h-6 rounded-full transition-colors ${field.value ? 'bg-green-500' : 'bg-muted'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mx-0.5 ${field.value ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            )} />
          </div>

          {/* Rollout */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-xs">Rollout percentage</label>
              <span className="font-mono text-sm font-bold tabular-nums">{rollout}%</span>
            </div>
            <Controller control={control} name="rolloutPct" render={({ field }) => (
              <input type="range" min={0} max={100} step={1} value={field.value}
                onChange={e => field.onChange(parseInt(e.target.value))}
                className="w-full accent-primary" />
            )} />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0% — nobody</span>
              <span>50% — half</span>
              <span>100% — everyone</span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label-xs block mb-1.5">Target tags <span className="normal-case font-normal">(comma-separated, optional)</span></label>
            <input {...register('tagsRaw')} placeholder="beta, internal, enterprise"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
            <p className="text-[11px] text-muted-foreground mt-1">Tags filter which users receive this flag. Leave empty to apply to all.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {flag ? 'Update flag' : 'Create flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Flag Card ─────────────────────────────────────────────────────────────────

function FlagCard({ flag, onEdit, onToggle }: {
  flag: FeatureFlagRow
  onEdit: () => void
  onToggle: (enabled: boolean) => void
}) {
  const [localEnabled, setLocalEnabled] = useState(flag.enabled)
  const [isPending, start] = useTransition()

  function toggle() {
    const next = !localEnabled
    setLocalEnabled(next)
    start(async () => {
      try {
        const result = await upsertFeatureFlag({
        name: flag.name, description: flag.description,
        enabled: next, rolloutPct: next ? (flag.rollout_pct || 100) : flag.rollout_pct,
        targetTags: flag.target_tags,
        }, flag.id)
        if (!result?.success) { setLocalEnabled(!next); toast.error(result?.error); return }
        onToggle(next)
        toast.success(`${flag.name} ${next ? 'enabled' : 'disabled'}`)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className={`rounded-xl border transition-all ${localEnabled ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-card'}`}>
      {/* Top bar */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-2 h-2 rounded-full ${localEnabled ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
            <code className="text-sm font-mono font-semibold truncate">{flag.name}</code>
            {flag.target_tags.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                <Tag className="h-2.5 w-2.5" />
                {flag.target_tags.join(', ')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{flag.description}</p>
        </div>

        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button onClick={onEdit}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={toggle} disabled={isPending}
            className={`w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${localEnabled ? 'bg-green-500' : 'bg-muted'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mx-0.5 ${localEnabled ? 'translate-x-[22px]' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border/50">
        {/* Rollout */}
        <div className="flex items-center gap-2 flex-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-muted-foreground">Rollout</span>
              <span className="text-[10px] font-mono font-semibold">{flag.rollout_pct}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${localEnabled ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                style={{ width: `${flag.rollout_pct}%` }} />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          {localEnabled
            ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-[11px] text-green-600 font-semibold">Live</span></>
            : <><XCircle className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Off</span></>
          }
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function FeatureFlagsClient({ initialFlags }: { initialFlags: FeatureFlagRow[] }) {
  const [flags, setFlags]         = useState(initialFlags)
  const [editing, setEditing]     = useState<FeatureFlagRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const enabled  = flags.filter(f => f.enabled).length
  const disabled = flags.length - enabled

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" /> {enabled} live
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> {disabled} off
          </span>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New flag
        </button>
      </div>

      {/* Empty state */}
      {flags.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="font-semibold mb-1">No feature flags yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create flags to safely roll out new features to subsets of users
          </p>
          <button onClick={() => { setEditing(null); setModalOpen(true) }}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors mx-auto">
            <Plus className="h-4 w-4" /> Create first flag
          </button>
        </div>
      )}

      {/* Flag grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {flags.map(flag => (
          <FlagCard
            key={flag.id}
            flag={flag}
            onEdit={() => { setEditing(flag); setModalOpen(true) }}
            onToggle={enabled => setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled } : f))}
          />
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" /> How feature flags work
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
          {[
            { icon: ChevronRight, text: 'Create a flag with a snake_case name and describe what it controls' },
            { icon: Users, text: 'Set rollout % to gradually expose the feature — 10% first, then 50%, then 100%' },
            { icon: Tag, text: 'Use target tags (e.g. "beta") to limit to specific user segments' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <FlagModal
        flag={editing}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
      />
    </div>
  )
}
