// lib/supabase/client.ts
'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

/**
 * Browser-side Supabase client — singleton via module scope.
 * Use in Client Components for realtime subscriptions and
 * auth state changes only. Prefer RSC + Server Actions for data.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
