import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Routes that require an authenticated session.
 * Prefix-matched: any path STARTING WITH these strings is protected.
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
]

/**
 * Specific tool routes that require authentication.
 * These are high-compute endpoints gated behind login.
 */
const PROTECTED_TOOL_ROUTES = [
  '/tools/ocr-pdf',
  '/tools/split-pdf',
  '/tools/remove-background',
  '/tools/bulk-ocr',
]

/**
 * Routes that authenticated users should NOT be able to visit.
 * Visiting /auth while logged in will bounce them home.
 */
const AUTH_ROUTES = ['/auth']

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function isProtected(pathname: string): boolean {
  const matchesPrefix = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )
  const matchesTool = PROTECTED_TOOL_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(route + '/')
  )
  return matchesPrefix || matchesTool
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route))
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Build a mutable response that tokens can be written into.
  // Starting with NextResponse.next() keeps all headers intact.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Create a Supabase SSR client that reads cookies from the request
  // and writes any refreshed tokens back into the response.
  // Both getAll AND setAll must be implemented — the @supabase/ssr docs
  // state that omitting setAll causes random logouts and stale sessions.
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Write refreshed tokens back to the request (for downstream use)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        // Re-build the response so cookie headers flow to the browser
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        // Attach each cookie to the outgoing response headers
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Calling getUser() triggers a silent token refresh when needed.
  // This is the ONLY secure way to read session state in middleware —
  // getSession() is NOT verified server-side and must never be used here.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user

  // ── RULE 1: Protected route gateway ────────────────────────────────────────
  // Unauthenticated users hitting a protected route are redirected to /auth
  // with the original destination appended so they return seamlessly after login.
  if (isProtected(pathname) && !isAuthenticated) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth'
    redirectUrl.searchParams.set('redirect', pathname)
    console.info(
      `[middleware] Unauthenticated access to "${pathname}" — redirecting to /auth?redirect=${pathname}`
    )
    return NextResponse.redirect(redirectUrl)
  }

  // ── RULE 2: Authenticated user lock ────────────────────────────────────────
  // Logged-in users visiting /auth are bounced to the home dashboard.
  if (isAuthRoute(pathname) && isAuthenticated) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.search = ''
    console.info(
      `[middleware] Authenticated user tried to visit "${pathname}" — redirecting to /`
    )
    return NextResponse.redirect(redirectUrl)
  }

  // All other routes: pass through with (possibly refreshed) session cookies.
  return response
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCHER — only run middleware on real page routes
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match every route EXCEPT:
     *   - _next/static  (build chunks, JS bundles)
     *   - _next/image   (Next.js image optimiser)
     *   - favicon.ico   (browser tab icon)
     *   - Any file with an extension (images, fonts, icons, etc.)
     *
     * This keeps middleware off static assets so page load speed
     * is not affected by the auth check.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js|map)$).*)',
  ],
}
