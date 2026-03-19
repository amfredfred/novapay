// actions/client.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import type { ActionResult } from '@/types'

// ── updateProfile ─────────────────────────────────────────────────────────────

const ProfileSchema = z.object({
  full_name:            z.string().min(2).max(100).nullable(),
  phone:                z.string().max(30).nullable(),
  date_of_birth:        z.string().nullable(),
  nationality:          z.string().length(2).nullable(),
  country_of_residence: z.string().length(2).nullable(),
})

export async function updateProfile(
  values: z.infer<typeof ProfileSchema>,
): Promise<ActionResult> {
  const user = await requireClient()
  const parsed = ProfileSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name:            parsed.data.full_name,
      phone:                parsed.data.phone,
      date_of_birth:        parsed.data.date_of_birth,
      nationality:          parsed.data.nationality,
      country_of_residence: parsed.data.country_of_residence,
    })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}

// ── toggleCardFreeze ──────────────────────────────────────────────────────────

export async function toggleCardFreeze(
  cardId: string,
  currentStatus: string,
): Promise<ActionResult<{ newStatus: string }>> {
  const user = await requireClient()
  const newStatus = currentStatus === 'frozen' ? 'active' : 'frozen'

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('cards')
    .update({ status: newStatus })
    .eq('id', cardId)
    .eq('user_id', user.id)  // belt-and-suspenders: RLS + explicit check

  if (error) return { success: false, error: error.message }
  revalidatePath('/cards')
  revalidatePath('/dashboard')
  return { success: true, data: { newStatus } }
}

// ── executeExchange ───────────────────────────────────────────────────────────

const ExchangeSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId:   z.string().uuid().optional(),
  fromCurrency:  z.string().length(3),
  toCurrency:    z.string().length(3),
  fromAmount:    z.number().positive(),
  toAmount:      z.number().positive(),
  rate:          z.number().positive(),
})

export async function executeExchange(
  values: z.infer<typeof ExchangeSchema>,
): Promise<ActionResult<{ txId: string }>> {
  const user = await requireClient()
  const parsed = ExchangeSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()

  // Verify the source account belongs to user and has sufficient balance
  const { data: fromAcct, error: acctErr } = await supabase
    .from('accounts')
    .select('id, balance, currency')
    .eq('id', parsed.data.fromAccountId)
    .eq('user_id', user.id)
    .single()

  if (acctErr || !fromAcct) return { success: false, error: 'Source account not found' }
  if (fromAcct.balance < parsed.data.fromAmount) {
    return { success: false, error: 'Insufficient balance' }
  }

  // Debit source account
  const { error: debitErr } = await supabase
    .from('accounts')
    .update({ balance: fromAcct.balance - parsed.data.fromAmount })
    .eq('id', parsed.data.fromAccountId)
    .eq('user_id', user.id)

  if (debitErr) return { success: false, error: debitErr.message }

  // Credit the target account — must already exist, no auto-create
  const { data: toAcct } = await supabase
    .from('accounts')
    .select('id, balance')
    .eq('user_id', user.id)
    .eq('currency', parsed.data.toCurrency)
    .eq('is_blocked', false)
    .maybeSingle()

  if (!toAcct) {
    // Rollback debit
    await supabase.from('accounts')
      .update({ balance: fromAcct.balance })
      .eq('id', parsed.data.fromAccountId)
    return { success: false, error: `You don't have a ${parsed.data.toCurrency} account. Open one first from Accounts.` }
  }

  await supabase
    .from('accounts')
    .update({ balance: toAcct.balance + parsed.data.toAmount })
    .eq('id', toAcct.id)

  // Record the FX transaction
  const ref = 'FX-' + Math.random().toString(36).slice(2, 10).toUpperCase()
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .insert({
      account_id:        parsed.data.fromAccountId,
      user_id:           user.id,
      description:       `FX: ${parsed.data.fromCurrency} → ${parsed.data.toCurrency}`,
      amount:            -parsed.data.fromAmount,
      currency:          parsed.data.fromCurrency as never,
      type:              'fx_exchange' as never,
      status:            'completed' as never,
      reference:         ref,
      category:          'FX Exchange',
      original_amount:   parsed.data.toAmount,
      original_currency: parsed.data.toCurrency as never,
      fx_rate:           parsed.data.rate,
      metadata:          { rate: parsed.data.rate },
    })
    .select('id')
    .single()

  if (txErr) return { success: false, error: txErr.message }

  revalidatePath('/exchange')
  revalidatePath('/dashboard')
  revalidatePath('/accounts')
  return { success: true, data: { txId: tx.id } }
}

// ── openAccount ───────────────────────────────────────────────────────────────

const OpenAccountSchema = z.object({
  productId: z.string().uuid(),
  currency:  z.string().length(3),
})

export async function openAccount(
  values: z.infer<typeof OpenAccountSchema>,
): Promise<ActionResult<{ accountId: string }>> {
  const user = await requireClient()
  const parsed = OpenAccountSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()

  // Check user doesn't already have this currency
  const { data: existing } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('currency', parsed.data.currency)
    .maybeSingle()

  if (existing) return { success: false, error: `You already have a ${parsed.data.currency} account` }

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      user_id:    user.id,
      product_id: parsed.data.productId,
      currency:   parsed.data.currency as never,
      balance:    0,
      is_primary: false,
    })
    .select('id')
    .single()

  if (error || !account) return { success: false, error: error?.message ?? 'Failed to open account' }

  revalidatePath('/accounts')
  revalidatePath('/dashboard')
  return { success: true, data: { accountId: account.id } }
}

// ── executeTransfer ───────────────────────────────────────────────────────────

const TransferSchema = z.object({
  fromAccountId:  z.string().uuid(),
  transferType:   z.enum(['sepa', 'novapay', 'international', 'iban', 'crypto', 'paypal', 'mobile_money', 'internal', 'custom']),
  recipientIban:  z.string().optional(),
  recipientEmail: z.string().email().optional().or(z.literal('')),
  recipientName:  z.string().min(2),
  amount:         z.number().positive(),
  currency:       z.string().length(3),
  reference:      z.string().max(140).optional(),
  methodFields:   z.record(z.string()).optional(),
  txPin:          z.string().min(4).max(6),
})

export async function executeTransfer(
  values: z.infer<typeof TransferSchema>,
): Promise<ActionResult<{ txId: string }>> {
  const user = await requireClient()
  const parsed = TransferSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()

  // Verify source account belongs to user and has sufficient balance
  const { data: fromAcct } = await supabase
    .from('accounts')
    .select('id, balance, currency')
    .eq('id', parsed.data.fromAccountId)
    .eq('user_id', user.id)
    .single()

  if (!fromAcct) return { success: false, error: 'Source account not found' }
  if (fromAcct.balance < parsed.data.amount) {
    return { success: false, error: 'Insufficient balance' }
  }

  // Debit source account
  const { error: debitErr } = await supabase
    .from('accounts')
    .update({ balance: fromAcct.balance - parsed.data.amount })
    .eq('id', parsed.data.fromAccountId)
    .eq('user_id', user.id)

  if (debitErr) return { success: false, error: debitErr.message }

  // If novapay internal transfer — credit recipient instantly
  if ((parsed.data.transferType === 'novapay' || parsed.data.transferType === 'internal') && parsed.data.recipientEmail) {
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', parsed.data.recipientEmail)
      .single()

    if (recipientProfile) {
      const { data: recipientAcct } = await supabase
        .from('accounts')
        .select('id, balance')
        .eq('user_id', recipientProfile.id)
        .eq('currency', parsed.data.currency)
        .eq('is_blocked', false)
        .maybeSingle()

      if (recipientAcct) {
        await supabase
          .from('accounts')
          .update({ balance: recipientAcct.balance + parsed.data.amount })
          .eq('id', recipientAcct.id)
      }
    }
  }

  // Record the outbound transaction
  const ref = parsed.data.reference || ('REF-' + Math.random().toString(36).slice(2, 10).toUpperCase())
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .insert({
      account_id:  parsed.data.fromAccountId,
      user_id:     user.id,
      description: `Transfer to ${parsed.data.recipientName}`,
      amount:      -parsed.data.amount,
      currency:    parsed.data.currency as never,
      type:        'sepa_transfer' as never,
      status:      (parsed.data.transferType === 'novapay' || parsed.data.transferType === 'internal') ? 'completed' as never : 'pending' as never,
      reference:   ref,
      metadata:    {
        transfer_type:   parsed.data.transferType,
        recipient_name:  parsed.data.recipientName,
        recipient_iban:  parsed.data.recipientIban ?? null,
        recipient_email: parsed.data.recipientEmail ?? null,
      } as never,
    })
    .select('id')
    .single()

  if (txErr || !tx) return { success: false, error: txErr?.message ?? 'Failed to create transaction' }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/accounts')
  return { success: true, data: { txId: tx.id } }
}

// ── submitKycForReview ────────────────────────────────────────────────────────

export async function submitKycForReview(): Promise<ActionResult> {
  const user = await requireClient()
  const supabase = await createClient()

  // Verify at least one document was uploaded
  const { data: docs } = await (supabase as any)
    .from('kyc_documents')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (!docs || docs.length === 0) {
    return { success: false, error: 'Upload at least one document first' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ kyc_status: 'pending' })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/kyc')
  revalidatePath('/dashboard')
  return { success: true, data: undefined }
}

// ── uploadKycDocument ─────────────────────────────────────────────────────────

const KycUploadSchema = z.object({
  docType:     z.enum(['passport', 'national_id', 'driving_licence', 'proof_of_address']),
  fileBase64:  z.string().min(1),
  mimeType:    z.string().regex(/^(image\/(jpeg|png|webp)|application\/pdf)$/),
  ext:         z.string().max(5),
})

export async function uploadKycDocument(
  values: z.infer<typeof KycUploadSchema>,
): Promise<ActionResult<{ path: string }>> {
  const user = await requireClient()
  const parsed = KycUploadSchema.safeParse(values)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const { createAdminClient } = await import('@/lib/supabase/server')
  const admin = createAdminClient()

  const path = `${user.id}/${parsed.data.docType}.${parsed.data.ext}`
  const buffer = Buffer.from(parsed.data.fileBase64, 'base64')

  const { error: uploadErr } = await admin.storage
    .from('kyc-documents')
    .upload(path, buffer, {
      contentType: parsed.data.mimeType,
      upsert: true,
    })

  if (uploadErr) return { success: false, error: uploadErr.message }

  // Upsert the kyc_documents row — use admin client to bypass RLS cleanly
  const { error: rowErr } = await (admin as any).from('kyc_documents').upsert({
    user_id:      user.id,
    doc_type:     parsed.data.docType,
    status:       'pending',
    storage_path: path,
  }, { onConflict: 'user_id,doc_type' })

  if (rowErr) return { success: false, error: rowErr.message }

  revalidatePath('/kyc')
  return { success: true, data: { path } }
}

// ── Transaction PIN ───────────────────────────────────────────────────────────

export async function setTxPin(pin: string): Promise<ActionResult> {
  const user = await requireClient()
  if (!/^\d{4,6}$/.test(pin)) return { success: false, error: 'PIN must be 4–6 digits' }

  // Hash with a simple approach using Web Crypto (available in Edge)
  const encoder  = new TextEncoder()
  const data     = encoder.encode(pin + user.id)
  const hashBuf  = await crypto.subtle.digest('SHA-256', data)
  const hashArr  = Array.from(new Uint8Array(hashBuf))
  const hashHex  = hashArr.map(b => b.toString(16).padStart(2, '0')).join('')

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ tx_pin_hash: hashHex } as any)
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true, data: undefined }
}

export async function verifyTxPin(pin: string): Promise<ActionResult> {
  const user = await requireClient()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tx_pin_hash')
    .eq('id', user.id)
    .single()

  if (!(profile as any)?.tx_pin_hash) {
    return { success: false, error: 'No transaction PIN set. Set one in Settings → Security.' }
  }

  const encoder  = new TextEncoder()
  const data     = encoder.encode(pin + user.id)
  const hashBuf  = await crypto.subtle.digest('SHA-256', data)
  const hashArr  = Array.from(new Uint8Array(hashBuf))
  const hashHex  = hashArr.map(b => b.toString(16).padStart(2, '0')).join('')

  if (hashHex !== (profile as any).tx_pin_hash) {
    return { success: false, error: 'Incorrect PIN' }
  }
  return { success: true, data: undefined }
}
