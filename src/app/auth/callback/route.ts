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

  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')?.trim() || '/'

  // Guard: if no code is present, this is a bad/stale callback
  if (!code) {
    console.warn('[auth/callback] No code parameter received — possible stale or replayed request.')
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed`)
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // Log full error server-side for debugging in Node runtime / Vercel logs
      console.error('[auth/callback] Code exchange failed:', {
        message: error.message,
        status: error.status,
        code,
      })
      return NextResponse.redirect(`${origin}/auth?error=oauth_failed`)
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
