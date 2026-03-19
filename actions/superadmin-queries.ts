// actions/superadmin-queries.ts
// Read-only server actions for superadmin UI (avoids prop drilling large datasets)
'use server'

import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'

export interface UserAccount {
  id:         string
  currency:   string
  balance:    number
  is_primary: boolean
  product:    string | null
}

export async function getUserAccounts(userId: string): Promise<UserAccount[]> {
  await requireSuperadmin()
  const supabase = await createClient()
  const { data } = await supabase
    .from('accounts')
    .select('id, currency, balance, is_primary, products(name)')
    .eq('user_id', userId)
    .eq('is_blocked', false)
    .order('is_primary', { ascending: false })
  return (data ?? []).map(a => ({
    id:         a.id,
    currency:   a.currency,
    balance:    a.balance,
    is_primary: a.is_primary,
    product:    (Array.isArray(a.products)
      ? (a.products as { name: string }[])[0]?.name
      : (a.products as { name: string } | null)?.name) ?? null,
  }))
}

export async function generateAiTransactions(prompt: string): Promise<Array<{
  date: string; description: string; amount: number; currency: string;
  type: string; merchant: string
}>> {
  await requireSuperadmin()

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set in environment')

  const system = `You are a financial data generator. Generate realistic bank transactions as a JSON array.
Each transaction must have: date (ISO string), description (string), amount (number, negative=debit), currency (3-letter code), type (one of: sepa_transfer|card_payment|atm_withdrawal|fx_exchange|direct_debit|salary|refund|fee|interest), merchant (string or "").
Return ONLY valid JSON array, no markdown, no explanation.`

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 2000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content ?? '[]'

  // Parse — strip any accidental markdown fences
  const clean = content.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
