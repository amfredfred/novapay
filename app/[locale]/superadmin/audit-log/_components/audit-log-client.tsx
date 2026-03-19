// app/[locale]/(superadmin)/audit-log/_components/audit-log-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, getInitials, cn } from '@/lib/utils'
import type { AuditLogRow } from '@/types'

// ── Action color map ──────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  'user.suspend':             'bg-destructive/10 text-destructive border-destructive/20',
  'user.unsuspend':           'bg-success-muted text-success border-success/20',
  'user.2fa_reset':           'bg-warning-muted text-warning border-warning/20',
  'user.kyc_override':        'bg-warning-muted text-warning border-warning/20',
  'product.create':           'bg-success-muted text-success border-success/20',
  'product.update':           'bg-primary/10 text-primary border-primary/20',
  'flag.create':              'bg-success-muted text-success border-success/20',
  'flag.update':              'bg-primary/10 text-primary border-primary/20',
  'history_generator.import': 'bg-primary/10 text-primary border-primary/20',
  'settings.update':          'bg-warning-muted text-warning border-warning/20',
}

// ── JSON diff viewer ──────────────────────────────────────────────────────────

function JsonDiff({ diff }: { diff: Record<string, unknown> | null }) {
  if (!diff) return null
  return (
    <pre className="mt-2 rounded-md bg-muted/80 border border-border px-3 py-2.5 text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
      {JSON.stringify(diff, null, 2)}
    </pre>
  )
}

// ── Audit entry row ───────────────────────────────────────────────────────────

function AuditEntry({ entry }: { entry: AuditLogRow }) {
  const [expanded, setExpanded] = useState(false)
  const initials = entry.actor_email.slice(0, 2).toUpperCase()
  const colorClass = ACTION_COLORS[entry.action] ?? 'bg-muted text-muted-foreground border-border'
  const hasDiff = entry.diff && Object.keys(entry.diff as object).length > 0

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors border-b border-border last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold mt-0.5">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge variant="outline" className={cn('text-[10px] font-medium', colorClass)}>
            {entry.action}
          </Badge>
          <span className="text-sm">
            <span className="text-muted-foreground">→</span>{' '}
            <span className="font-medium">{entry.target_id.slice(0, 8)}</span>
            {' '}
            <span className="text-muted-foreground text-xs">({entry.target_type})</span>
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">{entry.actor_email}</span>
          <span className="font-mono">{formatDateTime(entry.timestamp)}</span>
          {entry.ip && <span className="font-mono">{entry.ip}</span>}
        </div>

        {hasDiff && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2 transition-colors"
          >
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />}
            {expanded ? 'Hide diff' : 'Show diff'}
          </button>
        )}

        {expanded && hasDiff && (
          <JsonDiff diff={entry.diff as Record<string, unknown>} />
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  initialData: {
    data:     AuditLogRow[]
    count:    number
    page:     number
    pageSize: number
  }
  distinctActions: string[]
  initialParams:   Record<string, string | undefined>
}

export function AuditLogClient({ initialData, distinctActions, initialParams }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const sp         = useSearchParams()
  const [data, setData]         = useState(initialData.data)
  const [hasMore, setHasMore]   = useState(data.length < initialData.count)
  const [loadPage, setLoadPage] = useState(1)
  const [isPending, start]      = useTransition()
  const [actorSearch, setActorSearch] = useState(initialParams['actor'] ?? '')

  function updateUrl(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else   params.delete(k)
    })
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  function loadMore() {
    start(async () => {
      try {
        const nextPage = loadPage + 1
        const params   = new URLSearchParams(sp.toString())
        params.set('page', String(nextPage))
        const res = await fetch(`${pathname}?${params.toString()}`, {
        headers: { 'x-novapay-json': '1' },
        })
        if (!res.ok) return
        const json = await res.json() as { data: AuditLogRow[]; count: number }
        setData((prev) => [...prev, ...json.data])
        setHasMore(data.length + json.data.length < json.count)
        setLoadPage(nextPage)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Filter by actor email…"
            value={actorSearch}
            onChange={(e) => setActorSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') updateUrl({ actor: actorSearch || undefined })
            }}
          />
        </div>

        <Select
          value={sp.get('action') ?? ''}
          onValueChange={(v) => updateUrl({ action: v || undefined })}
        >
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {distinctActions.map((a) => (
              <SelectItem key={a} value={a} className="font-mono text-xs">{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="h-9 w-[150px]"
          value={sp.get('from') ?? ''}
          onChange={(e) => updateUrl({ from: e.target.value || undefined })}
        />
        <span className="text-muted-foreground text-sm">→</span>
        <Input
          type="date"
          className="h-9 w-[150px]"
          value={sp.get('to') ?? ''}
          onChange={(e) => updateUrl({ to: e.target.value || undefined })}
        />

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => router.refresh()}
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <p className="ml-auto text-sm text-muted-foreground">
          {initialData.count.toLocaleString()} total entries
        </p>
      </div>

      {/* Log */}
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          {data.map((entry) => (
            <AuditEntry key={entry.id} entry={entry} />
          ))}

          {data.length === 0 && (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
              No audit entries match the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load more */}
      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isPending}
            className="gap-2"
          >
            {isPending
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Loading…</>
              : `Load more (${(initialData.count - data.length).toLocaleString()} remaining)`}
          </Button>
        </div>
      )}
    </div>
  )
}
