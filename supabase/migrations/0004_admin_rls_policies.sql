-- ── Admin role: RLS policies on core tables ───────────────────────────────────
-- Admins need to read/update profiles, accounts, transactions for their
-- assigned users. We use a helper function to check assignment membership.

-- Helper: returns true if the current admin is assigned to the given user_id
create or replace function public.admin_can_access_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_assignments
    where admin_id = auth.uid()
      and user_id  = target_user_id
  );
$$;

-- ── profiles ──────────────────────────────────────────────────────────────────
create policy "profiles: admin select assigned"
  on public.profiles for select
  using (
    (auth.jwt()->'app_metadata'->>'role' = 'admin')
    and public.admin_can_access_user(id)
  );

create policy "profiles: admin update assigned"
  on public.profiles for update
  using (
    (auth.jwt()->'app_metadata'->>'role' = 'admin')
    and public.admin_can_access_user(id)
  )
  with check (
    (auth.jwt()->'app_metadata'->>'role' = 'admin')
    and public.admin_can_access_user(id)
  );

-- ── accounts ──────────────────────────────────────────────────────────────────
create policy "accounts: admin select assigned"
  on public.accounts for select
  using (
    (auth.jwt()->'app_metadata'->>'role' = 'admin')
    and public.admin_can_access_user(user_id)
  );

-- ── transactions ──────────────────────────────────────────────────────────────
create policy "transactions: admin select assigned"
  on public.transactions for select
  using (
    (auth.jwt()->'app_metadata'->>'role' = 'admin')
    and public.admin_can_access_user(user_id)
  );

-- ── fraud_flags ───────────────────────────────────────────────────────────────
create policy "fraud_flags: admin select assigned"
  on public.fraud_flags for select
  using (
    (auth.jwt()->'app_metadata'->>'role' = 'admin')
    and public.admin_can_access_user(user_id)
  );

-- ── notifications ─────────────────────────────────────────────────────────────
create policy "notifications: admin select assigned"
  on public.notifications for select
  using (
    (auth.jwt()->'app_metadata'->>'role' = 'admin')
    and public.admin_can_access_user(user_id)
  );

-- ── audit_log: allow admins to insert entries ─────────────────────────────────
-- The existing policy only allows superadmin. Admins performing KYC/dispute
-- actions also need to write audit log entries.
create policy "audit_log: admin insert"
  on public.audit_log for insert
  with check (
    auth.jwt()->'app_metadata'->>'role' = 'admin'
  );

-- ── audit_log: allow admins to read entries for their assigned users ───────────
create policy "audit_log: admin select assigned"
  on public.audit_log for select
  using (
    (auth.jwt()->'app_metadata'->>'role' = 'admin')
    and public.admin_can_access_user(target_id::uuid)
  );
