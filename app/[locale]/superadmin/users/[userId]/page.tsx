// app/[locale]/(superadmin)/users/[userId]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { formatCurrency, formatDateTime, getInitials } from '@/lib/utils'
import { KycBadge, AccountStatusBadge, TxTypeBadge, AmountCell } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, RotateCcw, UserX } from 'lucide-react'
import { UserActionsBar } from './_components/user-actions-bar'
import { AdminAssignPanel } from './_components/admin-assign-panel'
import { KycDocsViewer } from '@/components/kyc-docs-viewer'
import type { Currency } from '@/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>
}): Promise<Metadata> {
  const { userId } = await params
  return { title: `User ${userId.slice(0, 8)} · NovaPay` }
}

async function getUserDetail(userId: string) {
  const supabase = await createClient()
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (pErr || !profile) return null

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*, products(name,type)')
    .eq('user_id', userId)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('occurred_at', { ascending: false })
    .limit(50)

  const { data: auditEntries } = await supabase
    .from('audit_log')
    .select('*')
    .eq('target_id', userId)
    .order('timestamp', { ascending: false })
    .limit(20)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kycDocs } = await (supabase as any)
    .from('kyc_documents')
    .select('id, doc_type, status, storage_path, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  return { profile, accounts: accounts ?? [], transactions: transactions ?? [], auditEntries: auditEntries ?? [], kycDocs: kycDocs ?? [] }
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  await requireSuperadmin()
  const { userId } = await params
  const data = await getUserDetail(userId)
  if (!data) notFound()

  const { profile, accounts, transactions, auditEntries, kycDocs } = data
  const name = profile.full_name ?? 'Unnamed user'

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-1">
        <Link href="/superadmin/users">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold">
          {getInitials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-muted-foreground">{profile.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <KycBadge status={profile.kyc_status} />
            <AccountStatusBadge status={profile.account_status} />
            <Badge variant="secondary" className="font-mono text-[10px]">
              {profile.id.slice(0, 8)}
            </Badge>
            {profile.two_fa_enabled && (
              <Badge variant="outline" className="text-[10px]">2FA on</Badge>
            )}
          </div>
        </div>
        <UserActionsBar userId={profile.id} accountStatus={profile.account_status} />
        <AdminAssignPanel userId={profile.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ['Email',        profile.email],
              ['Phone',        profile.phone ?? '—'],
              ['DOB',          profile.date_of_birth ?? '—'],
              ['Nationality',  profile.nationality ?? '—'],
              ['Residence',    profile.country_of_residence ?? '—'],
              ['Created',      formatDateTime(profile.created_at)],
              ['Last login',   profile.last_login_at ? formatDateTime(profile.last_login_at) : '—'],
              ['KYC verified', profile.kyc_verified_at ? formatDateTime(profile.kyc_verified_at) : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{label}</span>
                <span className="font-medium text-right truncate">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Accounts */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Accounts ({accounts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.map((acct) => {
              const product = acct.products as unknown as { name: string; type: string } | null
              return (
                <div key={acct.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{product?.name ?? 'Unknown'}</span>
                      {acct.is_primary && (
                        <Badge variant="default" className="text-[10px]">Primary</Badge>
                      )}
                      {acct.is_blocked && (
                        <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {acct.iban ?? acct.id.slice(0, 16)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold tabular-nums">
                      {formatCurrency(acct.balance, acct.currency as Currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Opened {formatDateTime(acct.opened_at)}
                    </p>
                  </div>
                </div>
              )
            })}
            {accounts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No accounts</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Recent transactions (last 50)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider pl-6">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Description</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right pr-6">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border">
                    <TableCell className="pl-6">
                      <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDateTime(tx.occurred_at)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm">{tx.description}</p>
                    </TableCell>
                    <TableCell><TxTypeBadge type={tx.type} /></TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.status === 'completed' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <AmountCell amount={tx.amount} currency={tx.currency} />
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24 text-sm">
                      No transactions
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* KYC Documents */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              KYC Documents ({kycDocs.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {profile.kyc_status !== 'verified' && (
                <KycBadge status={profile.kyc_status} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <KycDocsViewer userId={profile.id} docs={kycDocs} />
        </CardContent>
      </Card>

      {/* Audit history for this user */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Audit history for this user ({auditEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {auditEntries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 px-6 py-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-semibold mt-0.5">
                {entry.actor_email.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{entry.action}</Badge>
                  <span className="text-xs text-muted-foreground">{entry.actor_email}</span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground mt-1">
                  {formatDateTime(entry.timestamp)}
                  {entry.ip && ` · ${entry.ip}`}
                </p>
              </div>
            </div>
          ))}
          {auditEntries.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-8">No audit history</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
