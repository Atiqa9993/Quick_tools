import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client that reads auth from cookies (website flow).
 * Use this to verify the logged-in user in API routes.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // setAll may fail in read-only contexts (e.g. middleware)
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase admin client with the service role key.
 * Use this for privileged operations (e.g. updating usage records).
 * NEVER expose this on the client side.
 */
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

/**
 * Extracts and verifies the authenticated user from:
 * 1. Supabase session cookies (website flow), OR
 * 2. Bearer token in Authorization header (Chrome extension flow)
 *
 * Returns the verified user or null if unauthenticated.
 */
export async function getAuthenticatedUser(req: NextRequest) {
  // Strategy 1: Check cookies (website auth)
  const supabaseCookie = await createSupabaseServerClient()
  const { data: { user: cookieUser } } = await supabaseCookie.auth.getUser()

  if (cookieUser) return cookieUser

  // Strategy 2: Check Authorization header (extension auth)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const supabaseAdmin = createSupabaseAdmin()
    const { data: { user: tokenUser } } = await supabaseAdmin.auth.getUser(token)
    return tokenUser
  }

  return null
}
