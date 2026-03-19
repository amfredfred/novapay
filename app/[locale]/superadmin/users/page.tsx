// app/[locale]/(superadmin)/users/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { parseSearchParams } from '@/lib/utils'
import { UsersTable } from './_components/users-table'

export const metadata: Metadata = { title: 'Users' }
export const dynamic = 'force-dynamic'

interface SearchParams {
  [key: string]: string | undefined
  page?:   string
  search?: string
  kyc?:    string
  status?: string
  sort?:   string
  dir?:    string
}

async function getUsers(params: Partial<SearchParams>) {
  const supabase   = await createClient()
  const page       = Math.max(1, parseInt(params.page ?? '1'))
  const pageSize   = 20
  const search     = params.search ?? ''
  const kyc        = params.kyc ?? ''
  const status     = params.status ?? ''
  const sortCol    = params.sort ?? 'created_at'
  const sortDir    = params.dir === 'asc'

  let query = supabase
    .from('profiles')
    .select('*, role_hint, accounts(id,balance,currency,is_primary)', { count: 'exact' })
    .order(sortCol, { ascending: sortDir })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,id.eq.${search}`,
    )
  }
  if (kyc)    query = query.eq('kyc_status', kyc)
  if (status) query = query.eq('account_status', status)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    data:      data ?? [],
    count:     count ?? 0,
    page,
    pageSize,
    pageCount: Math.ceil((count ?? 0) / pageSize),
  }
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function UsersPage({ searchParams }: Props) {
  await requireSuperadmin()
  const params = parseSearchParams<SearchParams>(await searchParams)
  const result = await getUsers(params)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.count.toLocaleString()} total users
          </p>
        </div>
      </div>
      <UsersTable initialData={result} initialParams={params} />
    </div>
  )
}
