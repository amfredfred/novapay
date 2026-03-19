// app/[locale]/(superadmin)/users/_components/users-table.tsx
'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import {
  Eye, UserX, UserCheck, RotateCcw, MoreHorizontal,
  Search, Download, SlidersHorizontal, Shield,
} from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { TablePagination } from '@/components/table-pagination'
import { KycBadge, AccountStatusBadge, CurrencyBadge } from '@/components/status-badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatDateTime, formatCurrency, getInitials } from '@/lib/utils'
import { suspendUser, unsuspendUser, resetTwoFactor } from '@/actions/superadmin'
import type { UserRow, PaginatedResult, KycStatus, AccountStatus, Currency } from '@/types'

// ── Column definitions ────────────────────────────────────────────────────────

function buildColumns(
  onView:    (user: UserRow) => void,
  onAction:  (userId: string, action: 'suspend' | 'unsuspend' | 'reset2fa') => void,
): ColumnDef<UserRow>[] {
  return [
    {
      id:     'id',
      header: 'ID',
      accessorKey: 'id',
      size:    110,
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      id:     'full_name',
      header: 'User',
      accessorKey: 'full_name',
      size:    220,
      cell: ({ row }) => {
        const name  = row.original.full_name ?? 'Unnamed'
        const email = row.original.email
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{name}</p>
                {(row.original as UserRow & { role_hint?: string }).role_hint === 'admin' && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                    <Shield className="h-2.5 w-2.5" />ADMIN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{email}</p>
            </div>
          </div>
        )
      },
    },
    {
      id:     'kyc_status',
      header: 'KYC',
      accessorKey: 'kyc_status',
      size:   120,
      cell: ({ getValue }) => <KycBadge status={getValue() as KycStatus} />,
    },
    {
      id:     'account_status',
      header: 'Status',
      accessorKey: 'account_status',
      size:   110,
      cell: ({ getValue }) => <AccountStatusBadge status={getValue() as AccountStatus} />,
    },
    {
      id:     'created_at',
      header: 'Created',
      accessorKey: 'created_at',
      size:   120,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatDate(getValue() as string)}
        </span>
      ),
    },
    {
      id:     'last_login_at',
      header: 'Last login',
      accessorKey: 'last_login_at',
      size:   120,
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {v ? formatDate(v) : '—'}
          </span>
        )
      },
    },
    {
      id:     'balance',
      header: 'Balance',
      enableSorting: false,
      size:   140,
      cell: ({ row }) => {
        const primary = (row.original.accounts as UserRow['accounts'])
          .find((a) => a.is_primary)
        if (!primary) return <span className="text-muted-foreground text-xs">—</span>
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm tabular-nums">
              {formatCurrency(primary.balance, primary.currency as Currency)}
            </span>
            <CurrencyBadge currency={primary.currency} />
          </div>
        )
      },
    },
    {
      id:    'actions',
      header: '',
      size:   56,
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(user)}>
                <Eye className="mr-2 h-4 w-4" /> View profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.account_status === 'active' ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onAction(user.id, 'suspend')}
                >
                  <UserX className="mr-2 h-4 w-4" /> Suspend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onAction(user.id, 'unsuspend')}>
                  <UserCheck className="mr-2 h-4 w-4" /> Unsuspend
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onAction(user.id, 'reset2fa')}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset 2FA
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

// ── User detail modal ─────────────────────────────────────────────────────────

function UserDetailModal({
  user,
  onClose,
  onAction,
}: {
  user: UserRow | null
  onClose: () => void
  onAction: (userId: string, action: 'suspend' | 'unsuspend' | 'reset2fa') => void
}) {
  if (!user) return null
  const name = user.full_name ?? 'Unnamed'

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>User profile</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 mt-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-semibold">
            {getInitials(name)}
          </div>
          <div>
            <p className="font-medium text-base">{name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{user.id}</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">KYC status</p>
            <KycBadge status={user.kyc_status} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Account status</p>
            <AccountStatusBadge status={user.account_status} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Created</p>
            <p className="font-mono text-xs">{formatDateTime(user.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Last login</p>
            <p className="font-mono text-xs">
              {user.last_login_at ? formatDateTime(user.last_login_at) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">2FA</p>
            <Badge variant={user.two_fa_enabled ? 'default' : 'secondary'}>
              {user.two_fa_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Country</p>
            <p>{user.country_of_residence ?? '—'}</p>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs text-muted-foreground mb-2">Balances</p>
          <div className="grid grid-cols-3 gap-2">
            {(user.accounts as UserRow['accounts']).map((acct) => (
              <div key={acct.id} className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-[10px] font-mono text-muted-foreground">{acct.currency}</p>
                <p className="font-mono text-sm font-medium tabular-nums mt-0.5">
                  {formatCurrency(acct.balance, acct.currency as Currency)}
                </p>
                {acct.is_primary && (
                  <p className="text-[10px] text-primary font-medium mt-0.5">Primary</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction(user.id, 'reset2fa')}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset 2FA
          </Button>
          {user.account_status === 'active' ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onAction(user.id, 'suspend'); onClose() }}
            >
              <UserX className="mr-1.5 h-3.5 w-3.5" /> Suspend account
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onAction(user.id, 'unsuspend'); onClose() }}
            >
              <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Unsuspend
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialData:   PaginatedResult<UserRow>
  initialParams: Record<string, string | undefined>
}

export function UsersTable({ initialData, initialParams }: Props) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const [data, setData]       = useState(initialData)
  const [viewUser, setViewUser] = useState<UserRow | null>(null)
  const [isPending, start]    = useTransition()
  const [search, setSearch]   = useState(initialParams['search'] ?? '')

  // ── URL-driven filter/page changes ───────────────────────────────────────

  const updateUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v)
        else   params.delete(k)
      })
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  // ── Row actions ──────────────────────────────────────────────────────────

  function handleAction(userId: string, action: 'suspend' | 'unsuspend' | 'reset2fa') {
    start(async () => {
      const result =
        action === 'suspend'   ? await suspendUser(userId) :
        action === 'unsuspend' ? await unsuspendUser(userId) :
                                 await resetTwoFactor(userId)

      if (!result.success) {
        toast.error('Action failed', { description: result.error })
        return
      }

      const labels = { suspend: 'Account suspended', unsuspend: 'Account unsuspended', reset2fa: '2FA reset' }
      toast.success(labels[action], { description: 'Audit log updated' })

      // Optimistic update on local data
      setData((prev) => ({
        ...prev,
        data: prev.data.map((u) => {
          if (u.id !== userId) return u
          if (action === 'suspend')   return { ...u, account_status: 'suspended' as const }
          if (action === 'unsuspend') return { ...u, account_status: 'active' as const }
          if (action === 'reset2fa')  return { ...u, two_fa_enabled: false }
          return u
        }),
      }))
    })
  }


  function exportCsv() {
    const rows = data.data as (UserRow & { role_hint?: string })[]
    const headers = ['ID', 'Name', 'Email', 'KYC', 'Status', 'Role', 'Created']
    const csv = [
      headers.join(','),
      ...rows.map(u => [
        u.id,
        `"${(u.full_name ?? '').replace(/"/g, '""')}"`,
        u.email,
        u.kyc_status,
        u.account_status,
        u.role_hint ?? 'client',
        u.created_at,
      ].join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'users.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = buildColumns(setViewUser, handleAction)

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search name, email, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') updateUrl({ search: search || undefined, page: '1' })
            }}
          />
        </div>

        <Select
          value={searchParams.get('kyc') ?? ''}
          onValueChange={(v) => updateUrl({ kyc: v || undefined, page: '1' })}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="All KYC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="not_started">Not started</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get('status') ?? ''}
          onValueChange={(v) => updateUrl({ status: v || undefined, page: '1' })}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data.data}
        isLoading={isPending}
        emptyMessage="No users match the current filters."
        onRowClick={setViewUser}
        sortBy={searchParams.get('sort') ?? 'created_at'}
        sortDir={(searchParams.get('dir') as 'asc' | 'desc') ?? 'desc'}
        onSortChange={(col, dir) => updateUrl({ sort: col, dir, page: '1' })}
        className="[&_tr]:group/row"
      />

      {/* Pagination */}
      <TablePagination
        page={data.page}
        pageCount={data.pageCount}
        pageSize={data.pageSize}
        count={data.count}
        onPageChange={(p) => updateUrl({ page: String(p) })}
        onSizeChange={(s) => updateUrl({ size: String(s), page: '1' })}
      />

      {/* User modal */}
      <UserDetailModal
        user={viewUser}
        onClose={() => setViewUser(null)}
        onAction={handleAction}
      />
    </>
  )
}
