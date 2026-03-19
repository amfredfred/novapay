// app/[locale]/(client)/cards/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth/client'
import { Plus } from 'lucide-react'
import { CardsClient } from './cards-client'
import type { Card } from '@/types/supabase'

export const metadata: Metadata = { title: 'Cards · NovaPay' }
export const dynamic = 'force-dynamic'

export default async function CardsPage() {
  const user = await requireClient()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawCards } = await (supabase as any)
    .from('cards')
    .select('id,account_id,user_id,product_id,last_four,card_type,network,status,expires_at,is_virtual,daily_limit,monthly_spent,created_at,metadata')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const cards = (rawCards ?? []) as Card[]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cards</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {cards.length} card{cards.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add card
        </button>
      </div>
      <CardsClient initialCards={cards} />
    </div>
  )
}
