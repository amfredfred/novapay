// actions/gateways.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin, writeAuditLog } from '@/lib/auth'
import { requireClient } from '@/lib/auth/client'
import type { ActionResult } from '@/types'
import type { PaymentGateway, Deposit } from '@/types/supabase'

// ── Superadmin: manage gateways ───────────────────────────────────────────────

const GatewaySchema = z.object({
  name:         z.string().min(2).max(80),
  type:         z.enum(['bank', 'crypto', 'ewallet', 'manual']),
  instructions: z.string().min(10),
  details:      z.record(z.string()),
  currencies:   z.array(z.string()).min(1),
  logo_url:     z.string().url().optional().or(z.literal('')),
  is_active:    z.boolean(),
  sort_order:   z.coerce.number().int().min(0),
})

export async function upsertGateway(
  values: z.infer<typeof GatewaySchema>,
  gatewayId?: string,
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireSuperadmin()
  const parsed = GatewaySchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  const payload = {
    name:         parsed.data.name,
    type:         parsed.data.type,
    instructions: parsed.data.instructions,
    details:      parsed.data.details,
    currencies:   parsed.data.currencies,
    logo_url:     parsed.data.logo_url || null,
    is_active:    parsed.data.is_active,
    sort_order:   parsed.data.sort_order,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  const { data, error } = gatewayId
    ? await supabaseAny.from('payment_gateways').update(payload).eq('id', gatewayId).select('id').single()
    : await supabaseAny.from('payment_gateways').insert(payload).select('id').single()

  if (error || !data) return { success: false, error: error?.message ?? 'Unknown error' }

  await writeAuditLog({
    actorId:    user.id,
    actorEmail: user.email ?? '',
    action:     gatewayId ? 'gateway.update' : 'gateway.create',
    targetType: 'settings',
    targetId:   data.id,
  })
  revalidatePath('/superadmin/gateways')
  return { success: true, data: { id: data.id } }
}

export async function deleteGateway(gatewayId: string): Promise<ActionResult> {
  const { user } = await requireSuperadmin()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('payment_gateways').update({ is_active: false }).eq('id', gatewayId)
  if (error) return { success: false, error: error.message }
  await writeAuditLog({ actorId: user.id, actorEmail: user.email ?? '', action: 'gateway.disable', targetType: 'settings', targetId: gatewayId })
  revalidatePath('/superadmin/gateways')
  return { success: true, data: undefined }
}

// ── Superadmin/Admin: review deposits ─────────────────────────────────────────

export async function approveDeposit(depositId: string): Promise<ActionResult> {
  const { user } = await requireSuperadmin()
  const supabase = await createClient()

  // Get deposit details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  const { data: deposit, error: fetchErr } = await supabaseAny
    .from('deposits').select('*').eq('id', depositId).single()
  if (fetchErr || !deposit) return { success: false, error: 'Deposit not found' }

  const d = deposit as Deposit

  // Credit the user's account
  const { data: account, error: acctErr } = await supabase
    .from('accounts').select('balance').eq('id', d.account_id).single()
  if (acctErr || !account) return { success: false, error: 'Account not found' }

  // Update account balance
  const { error: balErr } = await supabase
    .from('accounts')
    .update({ balance: account.balance + d.amount })
    .eq('id', d.account_id)
  if (balErr) return { success: false, error: balErr.message }

  // Record transaction
  const { error: txErr } = await supabase.from('transactions').insert({
    account_id:  d.account_id,
    user_id:     d.user_id,
    description: `Deposit via ${d.reference}`,
    amount:      d.amount,
    currency:    d.currency as never,
    type:        'salary' as never,      // closest type for inbound credit
    status:      'completed' as never,
    reference:   d.reference,
    category:    'Deposit',
    metadata:    { deposit_id: depositId } as never,
  })
  if (txErr) return { success: false, error: txErr.message }

  // Mark deposit approved
  const { error: depErr } = await supabaseAny.from('deposits').update({
    status:      'approved',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', depositId)
  if (depErr) return { success: false, error: depErr.message }

  await writeAuditLog({ actorId: user.id, actorEmail: user.email ?? '', action: 'deposit.approve', targetType: 'transaction', targetId: depositId })
  revalidatePath('/superadmin/deposits')
  revalidatePath('/admin/deposits')
  return { success: true, data: undefined }
}

export async function rejectDeposit(depositId: string, notes: string): Promise<ActionResult> {
  const { user } = await requireSuperadmin()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('deposits').update({
    status:      'rejected',
    admin_notes: notes,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', depositId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/superadmin/deposits')
  return { success: true, data: undefined }
}

// ── Client: create deposit request ───────────────────────────────────────────

const DepositSchema = z.object({
  accountId:  z.string().uuid(),
  gatewayId:  z.string().uuid(),
  amount:     z.number().positive(),
  currency:   z.string().length(3),
  reference:  z.string().min(3),
})

export async function createDeposit(
  values: z.infer<typeof DepositSchema>,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireClient()
  const parsed = DepositSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  // Verify account belongs to user
  const supabase = await createClient()
  const { data: account } = await supabase
    .from('accounts').select('id').eq('id', parsed.data.accountId).eq('user_id', user.id).single()
  if (!account) return { success: false, error: 'Account not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('deposits').insert({
    user_id:    user.id,
    account_id: parsed.data.accountId,
    gateway_id: parsed.data.gatewayId,
    amount:     parsed.data.amount,
    currency:   parsed.data.currency,
    reference:  parsed.data.reference,
    status:     'pending',
  }).select('id').single()

  if (error || !data) return { success: false, error: error?.message ?? 'Failed to create deposit' }

  revalidatePath('/receive')
  revalidatePath('/transactions')
  return { success: true, data: { id: data.id } }
}

export async function markPaymentSent(depositId: string, proofUrl?: string): Promise<ActionResult> {
  const user = await requireClient()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('deposits').update({
    status:    'payment_sent',
    proof_url: proofUrl ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', depositId).eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/receive')
  return { success: true, data: undefined }
}
