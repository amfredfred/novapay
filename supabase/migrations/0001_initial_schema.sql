-- supabase/migrations/0001_initial_schema.sql
-- NovaPay — complete database schema
-- Run: supabase db push

-- ── Extensions ────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pg_stat_statements";

-- ── Enums ─────────────────────────────────────────────────────────────────────

create type public.currency as enum (
  'EUR', 'USD', 'GBP', 'CHF', 'NGN', 'JPY', 'CAD', 'AUD'
);

create type public.tx_type as enum (
  'sepa_transfer', 'card_payment', 'atm_withdrawal', 'fx_exchange',
  'standing_order', 'direct_debit', 'salary', 'refund', 'fee', 'interest'
);

create type public.kyc_status as enum (
  'not_started', 'pending', 'verified', 'rejected'
);

create type public.account_status as enum (
  'active', 'suspended', 'closed'
);

create type public.tx_status as enum (
  'pending', 'completed', 'failed', 'reversed'
);

create type public.audit_target as enum (
  'user', 'transaction', 'product', 'flag', 'settings', 'account'
);

-- ── Profiles ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null unique,
  full_name             text,
  phone                 text,
  date_of_birth         date,
  nationality           char(2),
  country_of_residence  char(2),
  address               jsonb,
  kyc_status            public.kyc_status    not null default 'not_started',
  kyc_verified_at       timestamptz,
  account_status        public.account_status not null default 'active',
  two_fa_enabled        boolean               not null default false,
  created_at            timestamptz           not null default now(),
  updated_at            timestamptz           not null default now(),
  last_login_at         timestamptz,
  metadata              jsonb
);

-- Auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── Products ──────────────────────────────────────────────────────────────────

create table public.products (
  id                    uuid          primary key default uuid_generate_v4(),
  name                  text          not null,
  slug                  text          not null unique,
  type                  text          not null check (type in ('current_account','savings','credit_card','debit_card')),
  supported_currencies  public.currency[] not null default array['EUR']::public.currency[],
  monthly_fee           numeric(10,2) not null default 0,
  fee_currency          public.currency not null default 'EUR',
  tx_limit_daily        integer       not null default 5000,
  tx_limit_monthly      integer       not null default 50000,
  interest_rate         numeric(5,2),
  eligible_countries    char(2)[]     not null default array['DE','FR','GB']::char(2)[],
  is_active             boolean       not null default true,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  metadata              jsonb
);

create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

-- Seed default products
insert into public.products (name, slug, type, supported_currencies, monthly_fee, tx_limit_daily, tx_limit_monthly, eligible_countries) values
  ('NovaPay Current',  'novapay-current',  'current_account', array['EUR','USD','GBP']::public.currency[], 0,     10000,  100000, array['DE','FR','GB','ES','IT','NL','PL']::char(2)[]),
  ('NovaPay Premium',  'novapay-premium',  'current_account', array['EUR','USD','GBP','CHF','JPY']::public.currency[], 9.99,  50000,  500000, array['DE','FR','GB','ES','IT','NL','PL','CH','NO','SE']::char(2)[]),
  ('NovaSave',         'novasave',         'savings',         array['EUR','GBP']::public.currency[], 0,     5000,   50000,  array['DE','FR','GB','IT','ES']::char(2)[]),
  ('NovaCard Debit',   'novacard-debit',   'debit_card',      array['EUR','USD','GBP']::public.currency[], 2.99,  3000,   25000,  array['DE','FR','GB','ES','IT','NL','PL','CH']::char(2)[]),
  ('NovaCard Credit',  'novacard-credit',  'credit_card',     array['EUR','USD']::public.currency[], 4.99,  8000,   50000,  array['DE','FR','GB','ES','IT']::char(2)[]),
  ('NovaBusiness',     'novabusiness',     'current_account', array['EUR','USD','GBP','CHF','JPY','CAD','AUD','NGN']::public.currency[], 29.99, 200000, 2000000, array['DE','FR','GB','ES','IT','NL','PL','CH','NO','SE','US','CA','AU','NG']::char(2)[]);

-- ── Accounts ──────────────────────────────────────────────────────────────────

create table public.accounts (
  id          uuid            primary key default uuid_generate_v4(),
  user_id     uuid            not null references public.profiles(id) on delete cascade,
  product_id  uuid            not null references public.products(id),
  iban        text            unique,
  balance     numeric(18,2)   not null default 0,
  currency    public.currency not null default 'EUR',
  is_primary  boolean         not null default false,
  is_blocked  boolean         not null default false,
  opened_at   timestamptz     not null default now(),
  closed_at   timestamptz,
  metadata    jsonb,
  constraint  accounts_balance_nonneg check (balance >= 0)
);

create index accounts_user_id_idx on public.accounts(user_id);
create index accounts_product_id_idx on public.accounts(product_id);

-- Enforce single primary per user
create unique index accounts_primary_per_user
  on public.accounts(user_id)
  where is_primary = true;

-- ── Transactions ──────────────────────────────────────────────────────────────

create table public.transactions (
  id                  uuid            primary key default uuid_generate_v4(),
  account_id          uuid            not null references public.accounts(id),
  user_id             uuid            not null references public.profiles(id),
  occurred_at         timestamptz     not null default now(),
  settled_at          timestamptz,
  description         text            not null,
  amount              numeric(18,2)   not null,
  currency            public.currency not null,
  type                public.tx_type  not null,
  status              public.tx_status not null default 'completed',
  merchant            text,
  category            text,
  reference           text,
  counterparty_iban   text,
  counterparty_name   text,
  fx_rate             numeric(18,8),
  original_amount     numeric(18,2),
  original_currency   public.currency,
  is_generated        boolean         not null default false,
  is_deleted          boolean         not null default false,
  metadata            jsonb
);

create index transactions_user_id_idx      on public.transactions(user_id);
create index transactions_account_id_idx   on public.transactions(account_id);
create index transactions_occurred_at_idx  on public.transactions(occurred_at desc);
create index transactions_type_idx         on public.transactions(type);
create index transactions_status_idx       on public.transactions(status);

-- ── Feature flags ─────────────────────────────────────────────────────────────

create table public.feature_flags (
  id           uuid        primary key default uuid_generate_v4(),
  name         text        not null unique,
  description  text        not null,
  enabled      boolean     not null default false,
  rollout_pct  integer     not null default 0 check (rollout_pct between 0 and 100),
  target_tags  text[]      not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid        references public.profiles(id)
);

create trigger feature_flags_updated_at
  before update on public.feature_flags
  for each row execute procedure public.set_updated_at();

insert into public.feature_flags (name, description, enabled, rollout_pct, target_tags) values
  ('new_dashboard_v2',  'Redesigned dashboard with advanced analytics', true,  100, array['beta','ui']),
  ('instant_sepa',      'Sub-second SEPA via new rail integration',     true,   30, array['payments','experimental']),
  ('kyc_ai_review',     'AI-assisted KYC document verification',        false,   0, array['kyc','ai']),
  ('spending_insights', 'AI-powered spending categorisation',            true,   50, array['ai','analytics']),
  ('referral_v3',       'New referral rewards with tiered bonuses',      false,   0, array['growth']);

-- ── Audit log ─────────────────────────────────────────────────────────────────

create table public.audit_log (
  id           uuid            primary key default uuid_generate_v4(),
  timestamp    timestamptz     not null default now(),
  actor_id     uuid            not null,
  actor_email  text            not null,
  action       text            not null,
  target_type  public.audit_target not null,
  target_id    text            not null,
  diff         jsonb,
  ip           inet,
  user_agent   text
);

create index audit_log_timestamp_idx    on public.audit_log(timestamp desc);
create index audit_log_actor_id_idx     on public.audit_log(actor_id);
create index audit_log_action_idx       on public.audit_log(action);
create index audit_log_target_type_idx  on public.audit_log(target_type);

-- ── Global settings (single-row) ─────────────────────────────────────────────

create table public.global_settings (
  id                       integer       primary key default 1 check (id = 1),
  support_email            text          not null default 'support@novapay.io',
  min_kyc_amount           integer       not null default 150,
  max_login_attempts       integer       not null default 5,
  session_timeout_minutes  integer       not null default 30,
  default_currency         public.currency not null default 'EUR',
  maintenance_mode         boolean       not null default false,
  updated_at               timestamptz   not null default now(),
  updated_by               uuid          references public.profiles(id)
);

insert into public.global_settings default values;

-- ── Fraud flags ───────────────────────────────────────────────────────────────

create table public.fraud_flags (
  id              uuid        primary key default uuid_generate_v4(),
  transaction_id  uuid        references public.transactions(id),
  user_id         uuid        not null references public.profiles(id),
  score           numeric(4,3) not null check (score between 0 and 1),
  reason          text        not null,
  reviewed        boolean     not null default false,
  created_at      timestamptz not null default now()
);

create index fraud_flags_user_id_idx    on public.fraud_flags(user_id);
create index fraud_flags_created_at_idx on public.fraud_flags(created_at desc);
create index fraud_flags_reviewed_idx   on public.fraud_flags(reviewed) where reviewed = false;

-- ── Fee tables ────────────────────────────────────────────────────────────────

create table public.product_fees (
  id              uuid            primary key default uuid_generate_v4(),
  product_id      uuid            not null references public.products(id) on delete cascade,
  fee_type        text            not null,   -- 'sepa_domestic' | 'sepa_intra_eu' | 'sepa_intl' | 'atm' | 'fx_markup'
  amount          numeric(10,4)   not null default 0,
  is_percentage   boolean         not null default false,
  currency        public.currency,
  updated_at      timestamptz     not null default now(),
  unique (product_id, fee_type)
);

-- ── Views ─────────────────────────────────────────────────────────────────────

create view public.account_balances_by_currency as
select
  currency,
  sum(balance)    as total_balance,
  count(*)::int   as account_count
from public.accounts
where is_blocked = false
group by currency;

create view public.daily_volume as
select
  date_trunc('day', occurred_at)::date as date,
  currency,
  sum(abs(amount))  as volume,
  count(*)::int     as tx_count
from public.transactions
where is_deleted = false and status = 'completed'
group by 1, 2
order by 1 desc;

-- ── RLS helper ────────────────────────────────────────────────────────────────

create or replace function public.is_superadmin()
returns boolean
language sql stable security definer
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin',
    false
  );
$$;

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.accounts         enable row level security;
alter table public.transactions     enable row level security;
alter table public.products         enable row level security;
alter table public.feature_flags    enable row level security;
alter table public.audit_log        enable row level security;
alter table public.global_settings  enable row level security;
alter table public.fraud_flags      enable row level security;
alter table public.product_fees     enable row level security;

-- profiles
create policy "profiles: own row select"    on public.profiles for select using (auth.uid() = id);
create policy "profiles: superadmin select" on public.profiles for select using (public.is_superadmin());
create policy "profiles: superadmin update" on public.profiles for update using (public.is_superadmin()) with check (public.is_superadmin());

-- accounts
create policy "accounts: own"              on public.accounts for select using (auth.uid() = user_id);
create policy "accounts: superadmin full"  on public.accounts for all    using (public.is_superadmin()) with check (public.is_superadmin());

-- transactions
create policy "transactions: own"
  on public.transactions for select
  using (auth.uid() = user_id and is_deleted = false);

create policy "transactions: superadmin full"
  on public.transactions for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- products (authenticated read active; superadmin full)
create policy "products: authenticated read"
  on public.products for select
  using (auth.role() = 'authenticated' and is_active = true);

create policy "products: superadmin full"
  on public.products for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- feature_flags
create policy "feature_flags: superadmin only"
  on public.feature_flags for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- audit_log: superadmin select + insert; no update/delete for anyone
create policy "audit_log: superadmin select" on public.audit_log for select using (public.is_superadmin());
create policy "audit_log: server insert"     on public.audit_log for insert with check (public.is_superadmin());
create policy "audit_log: no update"         on public.audit_log for update using (false);
create policy "audit_log: no delete"         on public.audit_log for delete using (false);

-- global_settings
create policy "global_settings: superadmin only"
  on public.global_settings for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- fraud_flags
create policy "fraud_flags: superadmin only"
  on public.fraud_flags for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- product_fees
create policy "product_fees: authenticated read"
  on public.product_fees for select
  using (auth.role() = 'authenticated');

create policy "product_fees: superadmin full"
  on public.product_fees for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- ── Supabase Realtime ─────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.audit_log;

-- ── Cards table ───────────────────────────────────────────────────────────────
create table public.cards (
  id             uuid            primary key default uuid_generate_v4(),
  account_id     uuid            not null references public.accounts(id),
  user_id        uuid            not null references public.profiles(id),
  product_id     uuid            not null references public.products(id),
  last_four      char(4)         not null,
  card_type      text            not null check (card_type in ('debit','credit','virtual')),
  network        text            not null default 'visa' check (network in ('visa','mastercard')),
  status         text            not null default 'active' check (status in ('active','frozen','cancelled','expired')),
  expires_at     date            not null,
  is_virtual     boolean         not null default false,
  daily_limit    integer         not null default 1000,
  monthly_spent  numeric(18,2)   not null default 0,
  created_at     timestamptz     not null default now(),
  metadata       jsonb
);
create index cards_user_id_idx on public.cards(user_id);

alter table public.cards enable row level security;
create policy "cards: own" on public.cards for select using (auth.uid() = user_id);
create policy "cards: superadmin" on public.cards for all using (public.is_superadmin()) with check (public.is_superadmin());

-- ── KYC documents ────────────────────────────────────────────────────────────
create table public.kyc_documents (
  id             uuid        primary key default uuid_generate_v4(),
  user_id        uuid        not null references public.profiles(id),
  doc_type       text        not null check (doc_type in ('passport','driving_licence','national_id','proof_of_address')),
  status         text        not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  storage_path   text,
  reviewed_by    uuid        references public.profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);
alter table public.kyc_documents enable row level security;
create policy "kyc_docs: own" on public.kyc_documents for select using (auth.uid() = user_id);
create policy "kyc_docs: insert own" on public.kyc_documents for insert with check (auth.uid() = user_id);
create policy "kyc_docs: admin" on public.kyc_documents for all using (public.is_superadmin() or (auth.jwt()->'app_metadata'->>'role' = 'admin')) with check (public.is_superadmin() or (auth.jwt()->'app_metadata'->>'role' = 'admin'));

-- ── Disputes ─────────────────────────────────────────────────────────────────
create table public.disputes (
  id             uuid        primary key default uuid_generate_v4(),
  user_id        uuid        not null references public.profiles(id),
  transaction_id uuid        references public.transactions(id),
  reason         text        not null,
  description    text,
  status         text        not null default 'open' check (status in ('open','under_review','resolved','closed')),
  resolution     text,
  assigned_to    uuid        references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.disputes enable row level security;
create policy "disputes: own select" on public.disputes for select using (auth.uid() = user_id);
create policy "disputes: own insert" on public.disputes for insert with check (auth.uid() = user_id);
create policy "disputes: admin full" on public.disputes for all using (public.is_superadmin() or (auth.jwt()->'app_metadata'->>'role' = 'admin')) with check (public.is_superadmin() or (auth.jwt()->'app_metadata'->>'role' = 'admin'));

-- ── Notifications ─────────────────────────────────────────────────────────────
create table public.notifications (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references public.profiles(id),
  title       text        not null,
  body        text        not null,
  type        text        not null default 'info' check (type in ('info','success','warning','error','transaction')),
  read        boolean     not null default false,
  link        text,
  created_at  timestamptz not null default now()
);
create index notifications_user_id_idx on public.notifications(user_id);
alter table public.notifications enable row level security;
create policy "notifications: own" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Add admin role helper
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select coalesce((auth.jwt()->'app_metadata'->>'role') in ('admin','superadmin'), false);
$$;

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.transactions;

-- ── Missing RLS policies (added post-initial) ────────────────────────────────

-- Users can update their own profile (name, phone, dob, nationality, country)
-- but NOT kyc_status, account_status, or two_fa_enabled (those are admin-only)
create policy "profiles: own row update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Users can update their own cards (freeze/unfreeze, limit changes)
create policy "cards: own update"
  on public.cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can insert transactions on their own accounts (for exchange, transfer)
create policy "transactions: own insert"
  on public.transactions for insert
  with check (auth.uid() = user_id);

-- Users can insert their own accounts (needed for open-account feature)
create policy "accounts: own insert"
  on public.accounts for insert
  with check (auth.uid() = user_id);

-- Users can update their own account metadata (not balance - that's via functions)
create policy "accounts: own update"
  on public.accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Payment gateways (superadmin-managed deposit methods) ─────────────────────
create table public.payment_gateways (
  id           uuid        primary key default uuid_generate_v4(),
  name         text        not null,                          -- e.g. "PayPal", "Bitcoin"
  type         text        not null default 'manual'
                           check (type in ('bank','crypto','ewallet','manual')),
  is_active    boolean     not null default true,
  logo_url     text,                                          -- uploaded image URL
  instructions text        not null,                         -- full markdown instructions
  details      jsonb       not null default '{}',            -- address, account no, etc
  currencies   text[]      not null default '{"EUR","USD","GBP"}',
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.payment_gateways enable row level security;
create policy "gateways: public read"     on public.payment_gateways for select using (is_active = true);
create policy "gateways: superadmin full" on public.payment_gateways for all    using (public.is_superadmin()) with check (public.is_superadmin());
alter publication supabase_realtime add table public.payment_gateways;

-- ── Deposit requests ──────────────────────────────────────────────────────────
create table public.deposits (
  id             uuid        primary key default uuid_generate_v4(),
  user_id        uuid        not null references public.profiles(id),
  account_id     uuid        not null references public.accounts(id),
  gateway_id     uuid        not null references public.payment_gateways(id),
  amount         numeric(18,2) not null,
  currency       public.currency not null,
  status         text        not null default 'pending'
                             check (status in ('pending','payment_sent','approved','rejected','cancelled')),
  reference      text        not null,                        -- user's payment reference
  proof_url      text,                                        -- payment screenshot URL
  admin_notes    text,
  reviewed_by    uuid        references public.profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index deposits_user_id_idx   on public.deposits(user_id);
create index deposits_status_idx    on public.deposits(status);
alter table public.deposits enable row level security;
create policy "deposits: own"           on public.deposits for select using (auth.uid() = user_id);
create policy "deposits: own insert"    on public.deposits for insert with check (auth.uid() = user_id);
create policy "deposits: own update"    on public.deposits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "deposits: admin full"    on public.deposits for all    using (public.is_admin()) with check (public.is_admin());
create policy "deposits: superadmin"    on public.deposits for all    using (public.is_superadmin()) with check (public.is_superadmin());
alter publication supabase_realtime add table public.deposits;

-- Trigger updated_at
create trigger deposits_updated_at before update on public.deposits
  for each row execute procedure public.set_updated_at();

-- ── Admin user assignments ────────────────────────────────────────────────────
-- Maps which users are assigned to which admin for support purposes
create table public.admin_assignments (
  id         uuid        primary key default uuid_generate_v4(),
  admin_id   uuid        not null references public.profiles(id),
  user_id    uuid        not null references public.profiles(id),
  assigned_by uuid       references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (admin_id, user_id)
);
alter table public.admin_assignments enable row level security;
create policy "assignments: superadmin full" on public.admin_assignments
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy "assignments: admin read own" on public.admin_assignments
  for select using (auth.uid() = admin_id);

-- role_hint: synced from auth.users app_metadata for display purposes
-- Updated by set_admin() and set_superadmin() functions
alter table public.profiles add column if not exists role_hint text not null default 'client';
