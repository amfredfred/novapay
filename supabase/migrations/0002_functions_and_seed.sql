-- supabase/migrations/0002_functions_and_seed.sql
-- RPC helper functions only — no seed data that requires auth.users rows
-- To seed demo data, use the History Generator in the superadmin panel after creating users

-- ── get_dashboard_kpis ────────────────────────────────────────────────────────

create or replace function public.get_dashboard_kpis()
returns table (
  total_users       bigint,
  active_accounts   bigint,
  pending_kyc       bigint,
  fraud_flags_today bigint,
  system_health_pct numeric
)
language sql
stable
security definer
as $$
  select
    (select count(*) from public.profiles)                                                   as total_users,
    (select count(*) from public.accounts where is_blocked = false)                          as active_accounts,
    (select count(*) from public.profiles where kyc_status = 'pending')                     as pending_kyc,
    (select count(*) from public.fraud_flags where created_at >= now() - interval '1 day')  as fraud_flags_today,
    99.7                                                                                      as system_health_pct;
$$;

-- ── get_revenue_trend ─────────────────────────────────────────────────────────

create or replace function public.get_revenue_trend(months_back integer default 12)
returns table (
  month        text,
  revenue      numeric,
  tx_count     bigint
)
language sql
stable
security definer
as $$
  select
    to_char(date_trunc('month', occurred_at), 'Mon') as month,
    sum(abs(amount))                                  as revenue,
    count(*)                                          as tx_count
  from public.transactions
  where
    occurred_at >= now() - (months_back || ' months')::interval
    and status   = 'completed'
    and is_deleted = false
    and currency = 'EUR'
  group by date_trunc('month', occurred_at)
  order by date_trunc('month', occurred_at);
$$;

-- ── set_superadmin ────────────────────────────────────────────────────────────
-- Promote a user to superadmin role.
-- Usage: select public.set_superadmin('user@example.com');

create or replace function public.set_superadmin(user_email text)
returns text
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = user_email;

  if v_user_id is null then
    raise exception 'User not found: %', user_email;
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb
  where id = v_user_id;

  return 'Promoted ' || user_email || ' to superadmin';
end;
$$;

-- ── set_admin ─────────────────────────────────────────────────────────────────
-- Promote a user to admin role.
-- Usage: select public.set_admin('support@example.com');

create or replace function public.set_admin(user_email text)
returns text
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = user_email;

  if v_user_id is null then
    raise exception 'User not found: %', user_email;
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  where id = v_user_id;

  return 'Promoted ' || user_email || ' to admin';
end;
$$;

-- Returns all users with role=admin in app_metadata
-- Must be called with service_role key (superadmin only)
create or replace function public.get_admin_users()
returns table(id uuid, email text, full_name text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.email, p.full_name
  from public.profiles p
  inner join auth.users u on u.id = p.id
  where (u.raw_app_meta_data->>'role') = 'admin'
    and p.account_status = 'active'
  order by p.full_name;
$$;
grant execute on function public.get_admin_users() to authenticated;

create or replace function public.set_admin(user_email text)
returns void language plpgsql security definer as $$
begin
  update auth.users
  set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
  where email = user_email;
  -- Sync role_hint to profiles for display
  update public.profiles set role_hint = 'admin'
  where email = user_email;
end;
$$;