import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'

export async function GET() {
  const user = await requireClient()
  const supabase = await createClient()

  const { data } = await supabase
    .from('transactions')
    .select('occurred_at, description, type, amount, currency, status, reference')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('occurred_at', { ascending: false })
    .limit(5000)

  const rows = data ?? []
  const headers = ['Date', 'Description', 'Type', 'Amount', 'Currency', 'Status', 'Reference']
  const csv = [
    headers.join(','),
    ...rows.map(tx => [
      new Date(tx.occurred_at).toISOString().slice(0, 10),
      `"${(tx.description ?? '').replace(/"/g, '""')}"`,
      tx.type,
      tx.amount,
      tx.currency,
      tx.status,
      tx.reference ?? '',
    ].join(',')),
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
