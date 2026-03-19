# NovaPay — Superadmin Banking Platform

A production-grade online banking superadmin system built with Next.js 15, Supabase, and TypeScript strict mode.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, PPR, React Compiler) |
| Auth + DB | Supabase (Auth, Postgres, Realtime, Edge Functions) |
| ORM / client | @supabase/ssr + generated types |
| Language | TypeScript 5.7 strict (`noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS + shadcn/ui |
| Font | IBM Plex Sans + IBM Plex Mono |
| Data tables | TanStack Table v8 |
| Data fetching | TanStack Query v5 (client) + RSC (server) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| i18n | next-intl (6 locales: en, de, fr, es, pt, ar) |
| Toasts | Sonner |

## Project Structure

```
app/
└── [locale]/
    ├── page.tsx                          # Root redirect
    ├── layout.tsx                        # next-intl + IBM Plex fonts
    ├── unauthorized/page.tsx
    ├── (auth)/
    │   └── login/
    │       ├── page.tsx                  # RSC: redirect if already authed
    │       └── _components/login-form.tsx # Client: Supabase signInWithPassword
    └── (superadmin)/
        ├── layout.tsx                    # RSC: requireSuperadmin() + shell
        ├── _components/
        │   ├── sidebar.tsx               # Active-link nav (client)
        │   └── topbar.tsx                # Admin menu + signout (client)
        ├── dashboard/
        │   ├── page.tsx                  # RSC: parallel Supabase queries
        │   └── _components/
        │       ├── dashboard-charts.tsx  # Recharts (client island)
        │       └── quick-actions.tsx     # Link grid + service health
        ├── users/
        │   ├── page.tsx                  # RSC: paginated user list
        │   ├── _components/users-table.tsx # TanStack Table + URL filters
        │   └── [userId]/
        │       ├── page.tsx              # RSC: full user detail
        │       └── _components/user-actions-bar.tsx
        ├── products/
        │   ├── page.tsx
        │   └── _components/products-client.tsx  # CRUD table + modal
        ├── fees-limits/
        │   ├── page.tsx
        │   └── _components/fees-limits-client.tsx # 4 tabs, inline editing
        ├── feature-flags/
        │   ├── page.tsx
        │   └── _components/feature-flags-client.tsx # Toggle + rollout slider
        ├── audit-log/
        │   ├── page.tsx
        │   └── _components/audit-log-client.tsx  # Infinite scroll + diff viewer
        ├── history-generator/
        │   ├── page.tsx                  # RSC: fetch active users
        │   └── _components/history-generator-client.tsx # Form + preview + import
        └── system/
            ├── page.tsx
            └── _components/
                ├── global-settings-form.tsx
                ├── service-health-grid.tsx
                └── realtime-log-feed.tsx  # Supabase Realtime subscription

middleware.ts                # Edge: next-intl + JWT superadmin guard
actions/superadmin.ts        # All Server Actions (Zod + triple auth check)
lib/
├── supabase/server.ts       # createClient() + createAdminClient()
├── supabase/client.ts       # createBrowserClient()
├── auth/index.ts            # requireSuperadmin() + writeAuditLog()
├── i18n/routing.ts          # next-intl config
└── utils/
    ├── index.ts             # cn(), formatCurrency(), formatDateTime()
    └── tx-generator.ts      # Weighted-random synthetic transaction engine
types/
├── supabase.ts              # Generated DB types (Tables<T>, Enums<T>)
└── index.ts                 # Domain types
hooks/
├── use-supabase-realtime.ts # Realtime subscription hook
└── use-server-action.ts     # Server Action wrapper with toast + pending
supabase/
├── config.toml
└── migrations/
    └── 0001_initial_schema.sql  # Full schema, RLS, views, triggers, seed data
```

## Security Model

Every layer independently validates the superadmin role:

1. **Edge middleware** (`middleware.ts`) — `supabase.auth.getUser()` + `app_metadata.role === 'superadmin'`
2. **RSC layout** (`(superadmin)/layout.tsx`) — `requireSuperadmin()` from `lib/auth`
3. **Each Server Action** (`actions/superadmin.ts`) — `requireSuperadmin()` at the top of every action
4. **Postgres RLS** — `is_superadmin()` PL/pgSQL function checks the JWT claim at the row level

`app_metadata.role` is set server-side via the Supabase Admin API and cannot be modified by users.

The `audit_log` table has explicit `USING(false)` policies for UPDATE and DELETE — even a superadmin cannot modify or delete audit entries.

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local Supabase

```bash
pnpm supabase start
pnpm supabase db push    # applies migrations/0001_initial_schema.sql
```

### 3. Create a superadmin user

```bash
# In Supabase Studio or via the Admin API:
curl -X PATCH \
  'https://your-project.supabase.co/auth/v1/admin/users/USER_UUID' \
  -H 'apikey: SERVICE_ROLE_KEY' \
  -H 'Authorization: Bearer SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"app_metadata": {"role": "superadmin"}}'
```

### 4. Configure environment

```bash
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### 5. Install shadcn/ui components

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label card badge select dialog dropdown-menu switch slider separator tabs table popover calendar progress skeleton alert avatar tooltip
```

### 6. Run

```bash
pnpm dev        # http://localhost:3000 → redirects to /login → /superadmin/dashboard
pnpm typecheck  # zero errors expected
pnpm build      # production build
```

## Key Patterns

**Server Actions with triple auth:**
```ts
export async function suspendUser(userId: string): Promise<ActionResult> {
  const { user } = await requireSuperadmin()   // throws redirect if not authed
  // ... Zod validate, Supabase update, writeAuditLog, revalidatePath
}
```

**RSC data fetching with parallel queries:**
```ts
const [{ count: totalUsers }, { count: activeAccounts }] = await Promise.all([
  supabase.from('profiles').select('*', { count: 'exact', head: true }),
  supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('is_blocked', false),
])
```

**URL-driven table state (no client-side state for filters/sort/page):**
```ts
// URL: /superadmin/users?search=alice&kyc=pending&sort=created_at&dir=desc&page=2
const params = parseSearchParams<SearchParams>(await searchParams)
const result = await getUsers(params)   // server renders correct data
```

**Optimistic updates with server action confirmation:**
```ts
// In UsersTable client component
setData((prev) => ({
  ...prev,
  data: prev.data.map((u) =>
    u.id === userId ? { ...u, account_status: 'suspended' } : u,
  ),
}))
// Server action runs in background; router.refresh() syncs on completion
```
