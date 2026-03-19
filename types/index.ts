// types/index.ts
import type { Tables, Currency, TxType } from './supabase'

// Re-export for convenience
export type { Currency, TxType }

// ── Superadmin dashboard ─────────────────────────────────────────────────────

export interface DashboardKpis {
  totalUsers: number
  activeAccounts: number
  pendingKyc: number
  fraudFlagsToday: number
  systemHealthPct: number
  volumeByCurrency: Record<Currency, number>
}

export interface RevenueDataPoint {
  month: string
  revenue: number
  prevYear: number
  txCount: number
}

// ── Users ────────────────────────────────────────────────────────────────────

export type UserRow = Tables<'profiles'> & {
  accounts: Array<Pick<Tables<'accounts'>, 'id' | 'balance' | 'currency' | 'is_primary'>>
}

export type KycStatus = Tables<'profiles'>['kyc_status']
export type AccountStatus = Tables<'profiles'>['account_status']

// ── Transactions ─────────────────────────────────────────────────────────────

export type TransactionRow = Tables<'transactions'>

export interface GeneratedTransaction {
  id: string
  date: string
  description: string
  amount: number
  currency: Currency
  type: TxType
  merchant?: string | undefined
  category?: string | undefined
  reference?: string | undefined
  metadata: Record<string, unknown>
}

export interface ImportResult {
  inserted: number
  skipped: number
  auditLogId: string
}

// ── Products ─────────────────────────────────────────────────────────────────

export type ProductRow = Tables<'products'>

export interface ProductFormValues {
  name: string
  type: ProductRow['type']
  supportedCurrencies: Currency[]
  monthlyFee: number
  feeCurrency: Currency
  txLimitDaily: number
  txLimitMonthly: number
  interestRate: number | null
  eligibleCountries: string[]
  isActive: boolean
}

// ── Feature flags ─────────────────────────────────────────────────────────────

export type FeatureFlagRow = Tables<'feature_flags'>

export interface FlagFormValues {
  name: string
  description: string
  enabled: boolean
  rolloutPct: number
  targetTags: string[]
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export type AuditLogRow = Tables<'audit_log'>

// ── Fees ─────────────────────────────────────────────────────────────────────

export interface SepaFeeRow {
  productId: string
  productName: string
  domesticEur: number
  intraEuEur: number
  internationalEur: number
}

export interface FxMarkupRow {
  productId: string
  productName: string
  markupPct: number
  spotSpreadPct: number
}

export interface AtmFeeRow {
  productId: string
  productName: string
  freeWithdrawalsPerMonth: number
  feeAfterFreeEur: number
  maxPerDayEur: number
}

export interface LimitRow {
  productId: string
  productName: string
  dailyLimitEur: number
  weeklyLimitEur: number
  monthlyLimitEur: number
}

// ── Global settings ──────────────────────────────────────────────────────────

export type GlobalSettings = Tables<'global_settings'>

// ── API responses ─────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  pageCount: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  search?: string
}
