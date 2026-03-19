-- ── KYC: add missing unique constraint for upsert ────────────────────────────
alter table public.kyc_documents
  add constraint kyc_documents_user_id_doc_type_key unique (user_id, doc_type);

-- ── Transaction PIN ───────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists tx_pin_hash text;

-- ── Messages / Chat ───────────────────────────────────────────────────────────
create table public.messages (
  id          uuid        primary key default uuid_generate_v4(),
  sender_id   uuid        not null references public.profiles(id),
  receiver_id uuid        not null references public.profiles(id),
  body        text        not null check (char_length(body) <= 2000),
  read        boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index messages_sender_idx   on public.messages(sender_id);
create index messages_receiver_idx on public.messages(receiver_id);
create index messages_thread_idx   on public.messages(
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id),
  created_at
);

alter table public.messages enable row level security;

-- Users can read messages they sent or received
create policy "messages: participants select"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Users can send messages
create policy "messages: insert"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- Users can mark received messages as read
create policy "messages: mark read"
  on public.messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- Admins and superadmins can read all messages
create policy "messages: admin read"
  on public.messages for all
  using (
    public.is_superadmin()
    or (auth.jwt()->'app_metadata'->>'role' = 'admin')
  )
  with check (
    public.is_superadmin()
    or (auth.jwt()->'app_metadata'->>'role' = 'admin')
  );

alter publication supabase_realtime add table public.messages;

-- ── Feature flag: admin_can_create_users ──────────────────────────────────────
insert into public.feature_flags (name, description, enabled, rollout_pct, target_tags)
values (
  'admin_can_create_users',
  'Allow admin agents to create new client accounts directly',
  false,
  0,
  array[]::text[]
)
on conflict (name) do nothing;

-- ── FX rates table (superadmin-managed) ──────────────────────────────────────
create table if not exists public.fx_rates (
  id          uuid        primary key default uuid_generate_v4(),
  base        text        not null default 'EUR',
  quote       text        not null,
  rate        numeric(18,8) not null,
  updated_at  timestamptz not null default now(),
  unique (base, quote)
);

alter table public.fx_rates enable row level security;

create policy "fx_rates: authenticated read"
  on public.fx_rates for select
  using (auth.role() = 'authenticated');

create policy "fx_rates: superadmin manage"
  on public.fx_rates for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Seed default rates (EUR base)
insert into public.fx_rates (base, quote, rate) values
  ('EUR','USD',1.0870),('EUR','GBP',0.8570),('EUR','CHF',0.9450),
  ('EUR','NGN',1680.00),('EUR','JPY',162.40),('EUR','CAD',1.4720),
  ('EUR','AUD',1.6380)
on conflict (base, quote) do nothing;

-- ── Transfer methods (superadmin-managed, used on send money screen) ──────────
create table if not exists public.transfer_methods (
  id            uuid      primary key default uuid_generate_v4(),
  name          text      not null,
  type          text      not null check (type in ('iban','crypto','paypal','mobile_money','internal','custom')),
  instructions  text      not null default '',
  fields        jsonb     not null default '[]',  -- [{key, label, placeholder, required}]
  currencies    text[]    not null default '{}',
  is_active     boolean   not null default true,
  sort_order    int       not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.transfer_methods enable row level security;

create policy "transfer_methods: authenticated read active"
  on public.transfer_methods for select
  using (auth.role() = 'authenticated' and is_active = true);

create policy "transfer_methods: superadmin manage"
  on public.transfer_methods for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Seed default transfer methods
insert into public.transfer_methods (name, type, instructions, fields, currencies, sort_order) values
  ('SEPA Bank Transfer', 'iban',
   'Enter the recipient''s IBAN and their full name. SEPA transfers typically arrive within 1 business day.',
   '[{"key":"iban","label":"IBAN","placeholder":"GB29 NWBK 6016 1331 9268 19","required":true},{"key":"bic","label":"BIC / SWIFT","placeholder":"NWBKGB2L","required":false}]',
   '{"EUR","GBP","CHF"}', 0),
  ('NovaPay Internal', 'internal',
   'Send instantly to any NovaPay user by their registered email address. No fees.',
   '[{"key":"email","label":"Recipient email","placeholder":"friend@example.com","required":true}]',
   '{"EUR","USD","GBP","CHF","NGN","JPY","CAD","AUD"}', 1),
  ('PayPal', 'paypal',
   'Send to a PayPal email address. Funds arrive within minutes.',
   '[{"key":"paypal_email","label":"PayPal email","placeholder":"recipient@paypal.com","required":true}]',
   '{"EUR","USD","GBP"}', 2),
  ('Crypto (USDT TRC-20)', 'crypto',
   'Send USDT via the TRON network. Double-check the wallet address — crypto transfers are irreversible.',
   '[{"key":"wallet","label":"Wallet address","placeholder":"TQn9Y...","required":true},{"key":"network","label":"Network","placeholder":"TRC-20","required":false}]',
   '{"USD"}', 3)
on conflict do nothing;
