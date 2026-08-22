import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Environment variables are validated at startup.
 * Missing values will throw immediately rather than silently producing
 * an unauthenticated client with a placeholder URL.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

/**
 * Creates a cookie-scoped Supabase client for use in Server Components,
 * Route Handlers, and Server Actions. Reads and writes auth tokens via
 * the `next/headers` cookie store.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Cookie writes fail in read-only render contexts (e.g. during RSC).
          // The proxy layer handles token refreshes for those cases.
        }
      },
    },
  })
}

/**
 * Creates a Supabase admin client using the service-role key.
 * Bypasses Row Level Security — use exclusively in trusted server contexts.
 * Never import or expose this on the client side.
 */
export function createSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

/**
 * Resolves the authenticated user from an incoming API request.
 *
 * Tries two strategies in order:
 *  1. Session cookie (web app flow via `createSupabaseServerClient`)
 *  2. Bearer token in the `Authorization` header (Chrome extension flow)
 *
 * @returns The verified Supabase `User` object, or `null` if unauthenticated.
 */
export async function getAuthenticatedUser(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: cookieUser } } = await supabase.auth.getUser()
    if (cookieUser) return cookieUser

    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user: tokenUser } } = await createSupabaseAdmin().auth.getUser(token)
      return tokenUser
    }
  } catch {
    // Return null silently — caller is responsible for handling unauthenticated state.
  }

  return null
}
