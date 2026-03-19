-- ── Per-admin user creation permission ───────────────────────────────────────
-- Stored on profiles so it persists even when an admin has zero assignments.
alter table public.profiles
  add column if not exists can_create_users boolean not null default false;

-- Also add to admin_assignments for legacy/bulk updates
alter table public.admin_assignments
  add column if not exists can_create_users boolean not null default false;

-- Remove the blunt global feature flag added in 0005 (if it exists)
delete from public.feature_flags where name = 'admin_can_create_users';
