// types/supabase.ts
// In production: pnpm supabase gen types typescript --local > types/supabase.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne?: boolean; referencedRelation: string; referencedColumns: string[] }

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string | null; phone: string | null; date_of_birth: string | null; nationality: string | null; country_of_residence: string | null; address: Json | null; kyc_status: 'not_started' | 'pending' | 'verified' | 'rejected'; kyc_verified_at: string | null; account_status: 'active' | 'suspended' | 'closed'; two_fa_enabled: boolean; created_at: string; updated_at: string; last_login_at: string | null; metadata: Json | null }
        Insert: { id: string; email: string; full_name?: string | null; phone?: string | null; date_of_birth?: string | null; nationality?: string | null; country_of_residence?: string | null; address?: Json | null; kyc_status?: 'not_started' | 'pending' | 'verified' | 'rejected'; kyc_verified_at?: string | null; account_status?: 'active' | 'suspended' | 'closed'; two_fa_enabled?: boolean; last_login_at?: string | null; metadata?: Json | null }
        Update: { email?: string; full_name?: string | null; phone?: string | null; date_of_birth?: string | null; nationality?: string | null; country_of_residence?: string | null; address?: Json | null; kyc_status?: 'not_started' | 'pending' | 'verified' | 'rejected'; kyc_verified_at?: string | null; account_status?: 'active' | 'suspended' | 'closed'; two_fa_enabled?: boolean; last_login_at?: string | null; metadata?: Json | null }
        Relationships: Rel[]
      }
      accounts: {
        Row: { id: string; user_id: string; product_id: string; iban: string | null; balance: number; currency: Database['public']['Enums']['currency']; is_primary: boolean; is_blocked: boolean; opened_at: string; closed_at: string | null; metadata: Json | null }
        Insert: { id?: string; user_id: string; product_id: string; iban?: string | null; balance?: number; currency: Database['public']['Enums']['currency']; is_primary?: boolean; is_blocked?: boolean; closed_at?: string | null; metadata?: Json | null }
        Update: { product_id?: string; iban?: string | null; balance?: number; currency?: Database['public']['Enums']['currency']; is_primary?: boolean; is_blocked?: boolean; closed_at?: string | null; metadata?: Json | null }
        Relationships: Rel[]
      }
      transactions: {
        Row: { id: string; account_id: string; user_id: string; occurred_at: string; settled_at: string | null; description: string; amount: number; currency: Database['public']['Enums']['currency']; type: Database['public']['Enums']['tx_type']; status: 'pending' | 'completed' | 'failed' | 'reversed'; merchant: string | null; category: string | null; reference: string | null; counterparty_iban: string | null; counterparty_name: string | null; fx_rate: number | null; original_amount: number | null; original_currency: Database['public']['Enums']['currency'] | null; is_generated: boolean; is_deleted: boolean; metadata: Json | null }
        Insert: { id?: string; account_id: string; user_id: string; occurred_at?: string; settled_at?: string | null; description: string; amount: number; currency: Database['public']['Enums']['currency']; type: Database['public']['Enums']['tx_type']; status?: 'pending' | 'completed' | 'failed' | 'reversed'; merchant?: string | null; category?: string | null; reference?: string | null; counterparty_iban?: string | null; counterparty_name?: string | null; fx_rate?: number | null; original_amount?: number | null; original_currency?: Database['public']['Enums']['currency'] | null; is_generated?: boolean; is_deleted?: boolean; metadata?: Json | null }
        Update: { settled_at?: string | null; description?: string; amount?: number; status?: 'pending' | 'completed' | 'failed' | 'reversed'; is_deleted?: boolean; metadata?: Json | null }
        Relationships: Rel[]
      }
      products: {
        Row: { id: string; name: string; slug: string; type: 'current_account' | 'savings' | 'credit_card' | 'debit_card'; supported_currencies: Database['public']['Enums']['currency'][]; monthly_fee: number; fee_currency: Database['public']['Enums']['currency']; tx_limit_daily: number; tx_limit_monthly: number; interest_rate: number | null; eligible_countries: string[]; is_active: boolean; created_at: string; updated_at: string; metadata: Json | null }
        Insert: { id?: string; name: string; slug: string; type: 'current_account' | 'savings' | 'credit_card' | 'debit_card'; supported_currencies?: Database['public']['Enums']['currency'][]; monthly_fee?: number; fee_currency?: Database['public']['Enums']['currency']; tx_limit_daily?: number; tx_limit_monthly?: number; interest_rate?: number | null; eligible_countries?: string[]; is_active?: boolean; metadata?: Json | null }
        Update: { name?: string; slug?: string; type?: 'current_account' | 'savings' | 'credit_card' | 'debit_card'; supported_currencies?: Database['public']['Enums']['currency'][]; monthly_fee?: number; fee_currency?: Database['public']['Enums']['currency']; tx_limit_daily?: number; tx_limit_monthly?: number; interest_rate?: number | null; eligible_countries?: string[]; is_active?: boolean; metadata?: Json | null }
        Relationships: Rel[]
      }
      feature_flags: {
        Row: { id: string; name: string; description: string; enabled: boolean; rollout_pct: number; target_tags: string[]; created_at: string; updated_at: string; created_by: string | null }
        Insert: { id?: string; name: string; description: string; enabled?: boolean; rollout_pct?: number; target_tags?: string[]; created_by?: string | null }
        Update: { name?: string; description?: string; enabled?: boolean; rollout_pct?: number; target_tags?: string[]; created_by?: string | null }
        Relationships: Rel[]
      }
      audit_log: {
        Row: { id: string; timestamp: string; actor_id: string; actor_email: string; action: string; target_type: 'user' | 'transaction' | 'product' | 'flag' | 'settings' | 'account'; target_id: string; diff: Json | null; ip: string | null; user_agent: string | null }
        Insert: { id?: string; actor_id: string; actor_email: string; action: string; target_type: 'user' | 'transaction' | 'product' | 'flag' | 'settings' | 'account'; target_id: string; diff?: Json | null; ip?: string | null; user_agent?: string | null }
        Update: Record<string, never>
        Relationships: Rel[]
      }
      global_settings: {
        Row: { id: 1; support_email: string; min_kyc_amount: number; max_login_attempts: number; session_timeout_minutes: number; default_currency: Database['public']['Enums']['currency']; maintenance_mode: boolean; updated_at: string; updated_by: string | null }
        Insert: { id?: 1; support_email?: string; min_kyc_amount?: number; max_login_attempts?: number; session_timeout_minutes?: number; default_currency?: Database['public']['Enums']['currency']; maintenance_mode?: boolean; updated_by?: string | null }
        Update: { support_email?: string; min_kyc_amount?: number; max_login_attempts?: number; session_timeout_minutes?: number; default_currency?: Database['public']['Enums']['currency']; maintenance_mode?: boolean; updated_by?: string | null }
        Relationships: Rel[]
      }
      fraud_flags: {
        Row: { id: string; transaction_id: string | null; user_id: string; score: number; reason: string; reviewed: boolean; created_at: string }
        Insert: { id?: string; transaction_id?: string | null; user_id: string; score: number; reason: string; reviewed?: boolean }
        Update: { reviewed?: boolean }
        Relationships: Rel[]
      }
      product_fees: {
        Row: { id: string; product_id: string; fee_type: string; amount: number; is_percentage: boolean; currency: Database['public']['Enums']['currency'] | null; updated_at: string }
        Insert: { id?: string; product_id: string; fee_type: string; amount: number; is_percentage?: boolean; currency?: Database['public']['Enums']['currency'] | null }
        Update: { amount?: number; is_percentage?: boolean; currency?: Database['public']['Enums']['currency'] | null }
        Relationships: Rel[]
      }
    }

      cards: {
        Row: { id: string; account_id: string; user_id: string; product_id: string; last_four: string; card_type: 'debit' | 'credit' | 'virtual'; network: 'visa' | 'mastercard'; status: 'active' | 'frozen' | 'cancelled' | 'expired'; expires_at: string; is_virtual: boolean; daily_limit: number; monthly_spent: number; created_at: string; metadata: Json | null }
        Insert: { id?: string; account_id: string; user_id: string; product_id: string; last_four: string; card_type: 'debit' | 'credit' | 'virtual'; network?: 'visa' | 'mastercard'; status?: 'active' | 'frozen' | 'cancelled' | 'expired'; expires_at: string; is_virtual?: boolean; daily_limit?: number; monthly_spent?: number; metadata?: Json | null }
        Update: { status?: 'active' | 'frozen' | 'cancelled' | 'expired'; daily_limit?: number; monthly_spent?: number; metadata?: Json | null }
        Relationships: Rel[]
      }
      kyc_documents: {
        Row: { id: string; user_id: string; doc_type: 'passport' | 'driving_licence' | 'national_id' | 'proof_of_address'; status: 'pending' | 'approved' | 'rejected'; rejection_reason: string | null; storage_path: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string }
        Insert: { id?: string; user_id: string; doc_type: 'passport' | 'driving_licence' | 'national_id' | 'proof_of_address'; status?: 'pending' | 'approved' | 'rejected'; rejection_reason?: string | null; storage_path?: string | null; reviewed_by?: string | null; reviewed_at?: string | null }
        Update: { status?: 'pending' | 'approved' | 'rejected'; rejection_reason?: string | null; reviewed_by?: string | null; reviewed_at?: string | null }
        Relationships: Rel[]
      }
      disputes: {
        Row: { id: string; user_id: string; transaction_id: string | null; reason: string; description: string | null; status: 'open' | 'under_review' | 'resolved' | 'closed'; resolution: string | null; assigned_to: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; transaction_id?: string | null; reason: string; description?: string | null; status?: 'open' | 'under_review' | 'resolved' | 'closed'; resolution?: string | null; assigned_to?: string | null }
        Update: { status?: 'open' | 'under_review' | 'resolved' | 'closed'; resolution?: string | null; assigned_to?: string | null; updated_at?: string }
        Relationships: Rel[]
      }
      notifications: {
        Row: { id: string; user_id: string; title: string; body: string; type: 'info' | 'success' | 'warning' | 'error' | 'transaction'; read: boolean; link: string | null; created_at: string }
        Insert: { id?: string; user_id: string; title: string; body: string; type?: 'info' | 'success' | 'warning' | 'error' | 'transaction'; read?: boolean; link?: string | null }
        Update: { read?: boolean }
        Relationships: Rel[]
      }
    Views: {
      account_balances_by_currency: {
        Row: { currency: Database['public']['Enums']['currency']; total_balance: number; account_count: number }
        Relationships: Rel[]
      }
      daily_volume: {
        Row: { date: string; currency: Database['public']['Enums']['currency']; volume: number; tx_count: number }
        Relationships: Rel[]
      }
    }
    Functions: {
      is_superadmin: { Args: Record<PropertyKey, never>; Returns: boolean }
      get_dashboard_kpis: { Args: Record<PropertyKey, never>; Returns: { total_users: number; active_accounts: number; pending_kyc: number; fraud_flags_today: number; system_health_pct: number }[] }
      get_revenue_trend: { Args: { months_back?: number }; Returns: { month: string; revenue: number; tx_count: number }[] }
      set_superadmin: { Args: { user_email: string }; Returns: string }
    }
    Enums: {
      currency: 'EUR' | 'USD' | 'GBP' | 'CHF' | 'NGN' | 'JPY' | 'CAD' | 'AUD'
      tx_type: 'sepa_transfer' | 'card_payment' | 'atm_withdrawal' | 'fx_exchange' | 'standing_order' | 'direct_debit' | 'salary' | 'refund' | 'fee' | 'interest'
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type Currency = Enums<'currency'>
export type TxType = Enums<'tx_type'>

// ── Extended types for full platform ─────────────────────────────────────────

export interface Card {
  id:            string
  account_id:    string
  user_id:       string
  product_id:    string
  last_four:     string
  card_type:     'debit' | 'credit' | 'virtual'
  network:       'visa' | 'mastercard'
  status:        'active' | 'frozen' | 'cancelled' | 'expired'
  expires_at:    string
  is_virtual:    boolean
  daily_limit:   number
  monthly_spent: number
  created_at:    string
  metadata:      Record<string, unknown> | null
}

export interface KycDocument {
  id:               string
  user_id:          string
  doc_type:         'passport' | 'driving_licence' | 'national_id' | 'proof_of_address'
  status:           'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  storage_path:     string | null
  reviewed_by:      string | null
  reviewed_at:      string | null
  created_at:       string
}

export interface Dispute {
  id:             string
  user_id:        string
  transaction_id: string | null
  reason:         string
  description:    string | null
  status:         'open' | 'under_review' | 'resolved' | 'closed'
  resolution:     string | null
  assigned_to:    string | null
  created_at:     string
  updated_at:     string
}

export interface Notification {
  id:         string
  user_id:    string
  title:      string
  body:       string
  type:       'info' | 'success' | 'warning' | 'error' | 'transaction'
  read:       boolean
  link:       string | null
  created_at: string
}

export interface PaymentGateway {
  id:           string
  name:         string
  type:         'bank' | 'crypto' | 'ewallet' | 'manual'
  is_active:    boolean
  logo_url:     string | null
  instructions: string
  details:      Record<string, string>
  currencies:   string[]
  sort_order:   number
  created_at:   string
  updated_at:   string
}

export interface Deposit {
  id:          string
  user_id:     string
  account_id:  string
  gateway_id:  string
  amount:      number
  currency:    string
  status:      'pending' | 'payment_sent' | 'approved' | 'rejected' | 'cancelled'
  reference:   string
  proof_url:   string | null
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at:  string
  updated_at:  string
}
