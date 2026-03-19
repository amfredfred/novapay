// components/status-badge.tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { KycStatus, AccountStatus } from '@/types'

// ── KYC Status ────────────────────────────────────────────────────────────────

const KYC_STYLES: Record<KycStatus, string> = {
  verified:    'bg-success-muted text-success border-success/20',
  pending:     'bg-warning-muted text-warning border-warning/20',
  rejected:    'bg-destructive/10 text-destructive border-destructive/20',
  not_started: 'bg-muted text-muted-foreground border-border',
}

const KYC_DOT: Record<KycStatus, string> = {
  verified:    'bg-success',
  pending:     'bg-warning',
  rejected:    'bg-destructive',
  not_started: 'bg-muted-foreground',
}

export function KycBadge({ status }: { status: KycStatus }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', KYC_STYLES[status])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', KYC_DOT[status])} />
      {status.replace('_', ' ')}
    </Badge>
  )
}

// ── Account Status ────────────────────────────────────────────────────────────

const ACC_STYLES: Record<AccountStatus, string> = {
  active:    'bg-success-muted text-success border-success/20',
  suspended: 'bg-warning-muted text-warning border-warning/20',
  closed:    'bg-destructive/10 text-destructive border-destructive/20',
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge variant="outline" className={cn('font-medium', ACC_STYLES[status])}>
      {status}
    </Badge>
  )
}

// ── Currency Badge ────────────────────────────────────────────────────────────

export function CurrencyBadge({ currency }: { currency: string }) {
  return (
    <Badge variant="secondary" className="font-mono text-[10px] font-medium">
      {currency}
    </Badge>
  )
}

// ── Transaction type ──────────────────────────────────────────────────────────

const TX_STYLES: Record<string, string> = {
  salary:        'bg-success-muted text-success border-success/20',
  refund:        'bg-success-muted text-success border-success/20',
  interest:      'bg-success-muted text-success border-success/20',
  card_payment:  'bg-primary/10 text-primary border-primary/20',
  sepa_transfer: 'bg-primary/10 text-primary border-primary/20',
  fee:           'bg-destructive/10 text-destructive border-destructive/20',
}

export function TxTypeBadge({ type }: { type: string }) {
  const style = TX_STYLES[type] ?? 'bg-muted text-muted-foreground border-border'
  return (
    <Badge variant="outline" className={cn('font-medium text-[10px] uppercase tracking-wide', style)}>
      {type.replace(/_/g, ' ')}
    </Badge>
  )
}

// ── Amount display ────────────────────────────────────────────────────────────

export function AmountCell({
  amount,
  currency,
}: {
  amount: number
  currency: string
}) {
  const isPositive = amount >= 0
  return (
    <span
      className={cn(
        'font-mono text-sm tabular-nums',
        isPositive ? 'text-success' : 'text-foreground',
      )}
    >
      {isPositive ? '+' : ''}
      {amount.toFixed(2)} {currency}
    </span>
  )
}
