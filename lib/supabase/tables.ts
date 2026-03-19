// lib/supabase/tables.ts
// Typed wrappers for tables added after initial schema (supabase-js 2.46 type workaround)
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Card, KycDocument, Dispute, Notification } from '@/types/supabase'

type AnyClient = SupabaseClient<any>  // eslint-disable-line @typescript-eslint/no-explicit-any

export function cardsTable(supabase: AnyClient) {
  return supabase.from('cards') as unknown as ReturnType<SupabaseClient['from']> & {
    select: (cols?: string) => any  // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

/** Type-safe .from('cards') — returns Card rows */
export function fromCards(supabase: AnyClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('cards') as ReturnType<SupabaseClient<{ public: { Tables: { cards: { Row: Card; Insert: Partial<Card>; Update: Partial<Card>; Relationships: [] } }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {} } }>['from']>
}

/** Type-safe .from('kyc_documents') */
export function fromKycDocuments(supabase: AnyClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('kyc_documents') as ReturnType<SupabaseClient<{ public: { Tables: { kyc_documents: { Row: KycDocument; Insert: Partial<KycDocument>; Update: Partial<KycDocument>; Relationships: [] } }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {} } }>['from']>
}

/** Type-safe .from('disputes') */
export function fromDisputes(supabase: AnyClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('disputes') as ReturnType<SupabaseClient<{ public: { Tables: { disputes: { Row: Dispute; Insert: Partial<Dispute>; Update: Partial<Dispute>; Relationships: [] } }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {} } }>['from']>
}

/** Type-safe .from('notifications') */
export function fromNotifications(supabase: AnyClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('notifications') as ReturnType<SupabaseClient<{ public: { Tables: { notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification>; Relationships: [] } }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {} } }>['from']>
}
