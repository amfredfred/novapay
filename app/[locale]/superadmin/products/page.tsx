// app/[locale]/(superadmin)/products/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { ProductsClient } from './_components/products-client'

export const metadata: Metadata = { title: 'Products' }
export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  await requireSuperadmin()
  const supabase = await createClient()
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account types, card types, and fee plans — {products?.length ?? 0} products
        </p>
      </div>
      <ProductsClient initialProducts={products ?? []} />
    </div>
  )
}
