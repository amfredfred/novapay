// middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/lib/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

// Strip locale prefix to get the bare pathname for route matching
function getBarePath(pathname: string): string {
  // Remove locale prefix like /en/ or /de/ etc.
  const localeRegex = /^\/(en|de|fr|es|pt|ar)(\/|$)/
  return pathname.replace(localeRegex, '/')
}

// Build a redirect URL that preserves locale
function localeRedirect(request: NextRequest, targetPath: string): NextResponse {
  const url = request.nextUrl.clone()
  // Detect current locale from URL
  const localeMatch = url.pathname.match(/^\/(en|de|fr|es|pt|ar)(\/|$)/)
  const locale = localeMatch ? localeMatch[1] : 'en'
  // For default locale (en) with as-needed prefix, don't add /en
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  url.pathname = `${prefix}${targetPath}`
  return NextResponse.redirect(url)
}

export async function middleware(request: NextRequest) {
  // Run intl middleware first — it handles locale detection & rewriting
  const intlResponse = intlMiddleware(request)

  const { pathname } = request.nextUrl
  const barePath = getBarePath(pathname)

  // Build supabase client that refreshes session cookie
  const response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Write session cookies to BOTH response objects so they persist
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
            intlResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.['role'] as string | undefined

  // ── Maintenance mode ───────────────────────────────────────────────────────
  // Only check on non-admin/superadmin routes to avoid locking out staff
  if (!barePath.startsWith('/superadmin') && !barePath.startsWith('/admin')
      && !barePath.startsWith('/login') && !barePath.startsWith('/portal-select')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: settings } = await (supabase as any)
        .from('global_settings')
        .select('maintenance_mode')
        .eq('id', 1)
        .maybeSingle()
      if (settings?.maintenance_mode === true && role !== 'superadmin' && role !== 'admin') {
        return NextResponse.rewrite(new URL('/maintenance', request.url))
      }
    } catch {
      // DB not available yet — don't block
    }
  }

  // ── Superadmin routes ──────────────────────────────────────────────────────
  if (barePath.startsWith('/superadmin')) {
    if (!user) {
      const u = localeRedirect(request, `/login?next=${encodeURIComponent(pathname)}`)
      return u
    }
    if (role !== 'superadmin') return localeRedirect(request, '/unauthorized')
    return intlResponse   // ← always return intlResponse so locale rewriting works
  }

  // ── Admin routes ───────────────────────────────────────────────────────────
  if (barePath.startsWith('/admin')) {
    if (!user) {
      return localeRedirect(request, `/login?next=${encodeURIComponent(pathname)}`)
    }
    if (role !== 'admin' && role !== 'superadmin') return localeRedirect(request, '/unauthorized')
    return intlResponse
  }

  // ── Portal select ──────────────────────────────────────────────────────────
  if (barePath.startsWith('/portal-select')) {
    if (!user) return localeRedirect(request, '/login')
    return intlResponse
  }

  // ── Client protected routes ────────────────────────────────────────────────
  const CLIENT_PREFIXES = [
    '/dashboard', '/accounts', '/cards', '/transfer',
    '/transactions', '/exchange', '/settings', '/kyc',
  ]
  if (CLIENT_PREFIXES.some((p) => barePath === p || barePath.startsWith(p + '/'))) {
    if (!user) {
      return localeRedirect(request, `/login?next=${encodeURIComponent(pathname)}`)
    }
    // Staff accidentally hitting client routes → send to their portal selector
    if (role === 'superadmin' || role === 'admin') {
      return localeRedirect(request, '/portal-select')
    }
    return intlResponse
  }

  // ── Auth pages — skip if already signed in ─────────────────────────────────
  if (barePath.startsWith('/login') || barePath.startsWith('/register')) {
    if (user) {
      if (role === 'superadmin' || role === 'admin') return localeRedirect(request, '/portal-select')
      return localeRedirect(request, '/dashboard')
    }
    return intlResponse
  }

  // Everything else (landing, static, etc.)
  return intlResponse
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
