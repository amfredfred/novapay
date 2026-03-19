// actions/superadmin.ts
'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin, writeAuditLog } from '@/lib/auth'
import type { ActionResult, GeneratedTransaction, ImportResult, ProductFormValues, FlagFormValues } from '@/types'

async function getClientIp(): Promise<string | undefined> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? undefined
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const CURRENCIES = ['EUR','USD','GBP','CHF','NGN','JPY','CAD','AUD'] as const
const TX_TYPES = ['sepa_transfer','card_payment','atm_withdrawal','fx_exchange','standing_order','direct_debit','salary','refund','fee','interest'] as const

const TransactionSchema = z.object({
  id: z.string().uuid(), date: z.string().datetime(), description: z.string().min(1).max(255),
  amount: z.number().finite(), currency: z.enum(CURRENCIES), type: z.enum(TX_TYPES),
  merchant: z.string().optional(), category: z.string().optional(), reference: z.string().optional(),
  metadata: z.record(z.unknown()),
})

const ImportSchema = z.object({
  userId: z.string().uuid(),
  transactions: z.array(TransactionSchema).min(1).max(500),
})

const ProductSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['current_account','savings','credit_card','debit_card']),
  supportedCurrencies: z.array(z.enum(CURRENCIES)).min(1),
  monthlyFee: z.number().min(0),
  feeCurrency: z.enum(CURRENCIES),
  txLimitDaily: z.number().int().positive(),
  txLimitMonthly: z.number().int().positive(),
  interestRate: z.number().min(0).max(100).nullable(),
  eligibleCountries: z.array(z.string().length(2)).min(1),
  isActive: z.boolean(),
})

const FlagSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/).min(3).max(60),
  description: z.string().min(5).max(255),
  enabled: z.boolean(),
  rolloutPct: z.number().int().min(0).max(100),
  targetTags: z.array(z.string()),
})

const SettingsSchema = z.object({
  supportEmail: z.string().email(),
  minKycAmount: z.number().int().positive(),
  maxLoginAttempts: z.number().int().min(3).max(20),
  sessionTimeoutMinutes: z.number().int().min(5).max(1440),
  defaultCurrency: z.enum(CURRENCIES),
  maintenanceMode: z.boolean(),
})

// ── importGeneratedTransactions ───────────────────────────────────────────────

export async function importGeneratedTransactions(
  userId: string, transactions: GeneratedTransaction[],
): Promise<ActionResult<ImportResult>> {
  const { user } = await requireSuperadmin()
  const parsed = ImportSchema.safeParse({ userId, transactions })
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()

  const { data: profile, error: profileErr } = await supabase
    .from('profiles').select('id, email').eq('id', parsed.data.userId).single()
  if (profileErr || !profile) return { success: false, error: 'Target user not found' }

  // Use explicitly selected account from tx metadata, or fall back to primary
  const targetAccountId = parsed.data.transactions[0]?.metadata?.['targetAccountId'] as string | undefined
  let accountId: string
  if (targetAccountId) {
    accountId = targetAccountId
  } else {
    const { data: account, error: accountErr } = await supabase
      .from('accounts').select('id').eq('user_id', parsed.data.userId).eq('is_primary', true).single()
    if (accountErr || !account) return { success: false, error: 'Target user has no primary account' }
    accountId = account.id
  }

  const rows = parsed.data.transactions.map((tx) => ({
    account_id: accountId, user_id: parsed.data.userId, occurred_at: tx.date,
    description: tx.description, amount: tx.amount, currency: tx.currency, type: tx.type,
    status: 'completed' as const, merchant: tx.merchant ?? null, category: tx.category ?? null,
    reference: tx.reference ?? null, is_deleted: false,
    metadata: { ...tx.metadata, importedBy: user.id, importedAt: new Date().toISOString(), originalId: tx.id },
  }))

  const { data: inserted, error: insertErr } = await supabase.from('transactions').insert(rows).select('id')
  if (insertErr) return { success: false, error: `Insert failed: ${insertErr.message}` }

  const insertedCount = inserted?.length ?? 0

  // Update balance for every affected account.
  // Group rows by account_id and sum their net amounts, then apply.
  // No floor — negative balances are allowed (reflects real overdraft/debit history).
  const netByAccount = rows.reduce<Record<string, number>>((acc, tx) => {
    acc[tx.account_id] = (acc[tx.account_id] ?? 0) + tx.amount
    return acc
  }, {})

  for (const [acctId, net] of Object.entries(netByAccount)) {
    if (net === 0) continue
    const { data: acct } = await supabase
      .from('accounts').select('balance').eq('id', acctId).single()
    if (acct) {
      const newBalance = Math.round((acct.balance + net) * 100) / 100
      await supabase.from('accounts').update({ balance: newBalance }).eq('id', acctId)
    }
  }
  const { data: auditEntry } = await supabase.from('audit_log').insert({
    actor_id: user.id, actor_email: user.email ?? '', action: 'history_generator.import',
    target_type: 'user', target_id: parsed.data.userId,
    diff: { inserted: insertedCount, targetEmail: profile.email, currencies: [...new Set(rows.map((r) => r.currency))] },
    ip: await getClientIp() ?? null,
  }).select('id').single()

  revalidatePath('/superadmin/users')
  revalidatePath(`/superadmin/users/${parsed.data.userId}`)
  revalidatePath('/superadmin/audit-log')

  return { success: true, data: { inserted: insertedCount, skipped: rows.length - insertedCount, auditLogId: auditEntry?.id ?? '' } }
}

// ── suspendUser / unsuspendUser ───────────────────────────────────────────────

export async function suspendUser(userId: string): Promise<ActionResult> {
  const { user } = await requireSuperadmin()
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ account_status: 'suspended' }).eq('id', userId)
  if (error) return { success: false, error: error.message }
  await writeAuditLog({ actorId: user.id, actorEmail: user.email ?? '', action: 'user.suspend', targetType: 'user', targetId: userId, diff: { account_status: { before: 'active', after: 'suspended' } }, ...(await getClientIp() !== undefined ? { ip: await getClientIp()! } : {}) })
  revalidatePath('/superadmin/users'); revalidatePath(`/superadmin/users/${userId}`)
  return { success: true, data: undefined }
}

export async function unsuspendUser(userId: string): Promise<ActionResult> {
  const { user } = await requireSuperadmin()
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ account_status: 'active' }).eq('id', userId)
  if (error) return { success: false, error: error.message }
  await writeAuditLog({ actorId: user.id, actorEmail: user.email ?? '', action: 'user.unsuspend', targetType: 'user', targetId: userId, diff: { account_status: { before: 'suspended', after: 'active' } }, ...(await getClientIp() !== undefined ? { ip: await getClientIp()! } : {}) })
  revalidatePath('/superadmin/users'); revalidatePath(`/superadmin/users/${userId}`)
  return { success: true, data: undefined }
}

export async function resetTwoFactor(userId: string): Promise<ActionResult> {
  const { user } = await requireSuperadmin()
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ two_fa_enabled: false }).eq('id', userId)
  if (error) return { success: false, error: error.message }
  await writeAuditLog({ actorId: user.id, actorEmail: user.email ?? '', action: 'user.2fa_reset', targetType: 'user', targetId: userId })
  revalidatePath(`/superadmin/users/${userId}`)
  return { success: true, data: undefined }
}

// ── upsertProduct ─────────────────────────────────────────────────────────────

export async function upsertProduct(values: ProductFormValues, productId?: string): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireSuperadmin()
  const parsed = ProductSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  const { name, type, supportedCurrencies, monthlyFee, feeCurrency, txLimitDaily, txLimitMonthly, interestRate, eligibleCountries, isActive } = parsed.data
  const payload = {
    name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    type, supported_currencies: supportedCurrencies, monthly_fee: monthlyFee, fee_currency: feeCurrency,
    tx_limit_daily: txLimitDaily, tx_limit_monthly: txLimitMonthly, interest_rate: interestRate,
    eligible_countries: eligibleCountries, is_active: isActive,
  }

  const { data, error } = productId
    ? await supabase.from('products').update(payload).eq('id', productId).select('id').single()
    : await supabase.from('products').insert(payload).select('id').single()
  if (error || !data) return { success: false, error: error?.message ?? 'Unknown error' }

  await writeAuditLog({ actorId: user.id, actorEmail: user.email ?? '', action: productId ? 'product.update' : 'product.create', targetType: 'product', targetId: data.id })
  revalidatePath('/superadmin/products')
  return { success: true, data: { id: data.id } }
}

// ── upsertFeatureFlag ─────────────────────────────────────────────────────────

export async function upsertFeatureFlag(values: FlagFormValues, flagId?: string): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireSuperadmin()
  const parsed = FlagSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  const payload = { name: parsed.data.name, description: parsed.data.description, enabled: parsed.data.enabled, rollout_pct: parsed.data.rolloutPct, target_tags: parsed.data.targetTags, created_by: user.id }

  const { data, error } = flagId
    ? await supabase.from('feature_flags').update(payload).eq('id', flagId).select('id').single()
    : await supabase.from('feature_flags').insert(payload).select('id').single()
  if (error || !data) return { success: false, error: error?.message ?? 'Unknown error' }

  await writeAuditLog({ actorId: user.id, actorEmail: user.email ?? '', action: flagId ? 'flag.update' : 'flag.create', targetType: 'flag', targetId: data.id, diff: { name: parsed.data.name, enabled: parsed.data.enabled } })
  revalidatePath('/superadmin/feature-flags')
  return { success: true, data: { id: data.id } }
}

// ── updateGlobalSettings ──────────────────────────────────────────────────────

export async function updateGlobalSettings(values: z.infer<typeof SettingsSchema>): Promise<ActionResult> {
  const { user } = await requireSuperadmin()
  const parsed = SettingsSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  // upsert so it works on fresh installs (no existing row)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('global_settings').upsert({
    id: 1,
    support_email: parsed.data.supportEmail,
    min_kyc_amount: parsed.data.minKycAmount,
    max_login_attempts: parsed.data.maxLoginAttempts,
    session_timeout_minutes: parsed.data.sessionTimeoutMinutes,
    default_currency: parsed.data.defaultCurrency,
    maintenance_mode: parsed.data.maintenanceMode,
    updated_by: user.id,
  }, { onConflict: 'id' })
  if (error) return { success: false, error: error.message }

  await writeAuditLog({ actorId: user.id, actorEmail: user.email ?? '', action: 'settings.update', targetType: 'settings', targetId: '1' })
  revalidatePath('/superadmin/system')
  return { success: true, data: undefined }
}

// ── upsertTransferMethod ──────────────────────────────────────────────────────

export async function upsertTransferMethod(
  data: {
    name: string; type: string; instructions: string
    fields: any[]; currencies: string[]; is_active: boolean; sort_order: number
  },
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireSuperadmin()
  const supabase = await createClient()
  const payload  = { name: data.name, type: data.type, instructions: data.instructions, fields: data.fields, currencies: data.currencies, is_active: data.is_active, sort_order: data.sort_order }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = id
    ? (supabase as any).from('transfer_methods').update(payload).eq('id', id).select('id').single()
    : (supabase as any).from('transfer_methods').insert(payload).select('id').single()
  const { data: row, error } = await q
  if (error || !row) return { success: false, error: error?.message ?? 'Unknown error' }
  revalidatePath('/superadmin/transfer-methods')
  return { success: true, data: { id: row.id } }
}
