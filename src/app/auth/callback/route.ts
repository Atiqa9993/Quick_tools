import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * GET /auth/callback
 *
 * Server-side handler for the Google OAuth PKCE flow.
 * Supabase redirects here after authentication, appending a one-time `code`.
 *
 * Flow:
 *  1. Origin resolved dynamically — no hardcoded domain strings.
 *  2. Provider errors and missing codes redirect to /auth?error=oauth_failed.
 *  3. Successful exchange redirects to `next` param (defaults to `/`).
 *  4. Unexpected failures are caught and surfaced as redirects, never 500s.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin

  const code = requestUrl.searchParams.get('code')
  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next')?.trim() || '/'

  if (errorParam || errorDescription) {
    console.error('[auth/callback] Provider error:', { errorParam, errorDescription })
    return NextResponse.redirect(
      `${origin}/auth?error=oauth_failed&desc=${encodeURIComponent(errorDescription || errorParam || '')}`
    )
  }

  if (!code) {
    console.warn('[auth/callback] No code parameter — stale or replayed request.')
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed&desc=no_code_received`)
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] Code exchange failed:', error.message)
      return NextResponse.redirect(
        `${origin}/auth?error=oauth_failed&desc=${encodeURIComponent(error.message)}`
      )
    }

    // Only allow relative same-origin redirects to prevent open-redirect attacks.
    const safeNext = next.startsWith('/') ? next : '/'
    return NextResponse.redirect(`${origin}${safeNext}`)

  } catch (err) {
    console.error('[auth/callback] Unexpected exception during code exchange:', err)
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed`)
  }
}
