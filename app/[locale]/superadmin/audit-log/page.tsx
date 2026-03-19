// app/[locale]/(superadmin)/audit-log/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { AuditLogClient } from './_components/audit-log-client'
import { parseSearchParams } from '@/lib/utils'

export const metadata: Metadata = { title: 'Audit Log' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

interface SearchParams {
  [key: string]: string | undefined
  action?: string
  actor?:  string
  from?:   string
  to?:     string
  page?:   string
}

async function getAuditLog(params: Partial<SearchParams>) {
  const supabase = await createClient()
  const page     = Math.max(1, parseInt(params.page ?? '1'))

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (params.action) query = query.eq('action', params.action)
  if (params.actor)  query = query.ilike('actor_email', `%${params.actor}%`)
  if (params.from)   query = query.gte('timestamp', new Date(params.from).toISOString())
  if (params.to)     query = query.lte('timestamp', new Date(params.to).toISOString())

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return { data: data ?? [], count: count ?? 0, page, pageSize: PAGE_SIZE }
}

async function getDistinctActions() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('audit_log')
    .select('action')
    .limit(1000)

  const actions = [...new Set((data ?? []).map((r) => r.action))].sort()
  return actions
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AuditLogPage({ searchParams }: Props) {
  await requireSuperadmin()
  const params  = parseSearchParams<SearchParams>(await searchParams)
  const [result, actions] = await Promise.all([
    getAuditLog(params),
    getDistinctActions(),
  ])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Immutable, append-only · {result.count.toLocaleString()} total entries
        </p>
      </div>
      <AuditLogClient
        initialData={result}
        distinctActions={actions}
        initialParams={params}
      />
    </div>
  )
}
