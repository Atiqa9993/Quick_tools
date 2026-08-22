import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * GET /auth/callback
 *
 * Handles the server-side leg of the Google OAuth PKCE flow.
 * Supabase redirects here after the user authenticates with Google,
 * appending a one-time `code` query parameter.
 *
 * Steps:
 *   1. Parse the request origin dynamically — no hardcoded domains.
 *   2. Extract `code` and optional `next` redirect target from the URL.
 *   3. Exchange the code for a session via Supabase SSR client.
 *   4. On success  → redirect to `next` (defaults to `/`).
 *   5. On failure  → log the error server-side, redirect to `/auth?error=oauth_failed`.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin // dynamically resolved — no hardcoded strings

  console.log('[auth/callback] Full Callback URL:', request.url)
  console.log('[auth/callback] Search Params:', Object.fromEntries(requestUrl.searchParams.entries()))

  const code = requestUrl.searchParams.get('code')
  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next')?.trim() || '/'

  if (errorParam || errorDescription) {
    console.error('[auth/callback] OAuth provider error:', { errorParam, errorDescription })
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed&desc=${encodeURIComponent(errorDescription || errorParam || '')}`)
  }

  if (!code) {
    console.warn('[auth/callback] No code parameter received — possible stale or replayed request.')
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed&desc=no_code_received`)
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] Code exchange failed detail:', error)
      return NextResponse.redirect(`${origin}/auth?error=oauth_failed&desc=${encodeURIComponent(error.message)}`)
    }

    // Sanitise the `next` param — only allow same-origin relative paths
    const safeNext = next.startsWith('/') ? next : '/'

    console.info('[auth/callback] OAuth session established. Redirecting to:', safeNext)
    return NextResponse.redirect(`${origin}${safeNext}`)

  } catch (err) {
    // Catch unexpected failures (network issues, malformed cookies, etc.)
    console.error('[auth/callback] Unexpected exception during code exchange:', err)
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed`)
  }
}
