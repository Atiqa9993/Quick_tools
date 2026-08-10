import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  // Verify the user's identity server-side
  const user = await getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required. Please log in.' },
      { status: 401 }
    )
  }

  const userId = user.id
  const { pages } = await req.json()
  const supabase = createSupabaseAdmin()

  const { data: usage } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!usage) return NextResponse.json({ error: 'No usage record' }, { status: 404 })

  // Pro user — no limit
  if (usage.is_pro) return NextResponse.json({ success: true })

  // Free user — check limit
  if (usage.pages_used >= 5) {
    return NextResponse.json({ error: 'Limit reached', upgrade: true }, { status: 403 })
  }

  await supabase
    .from('usage')
    .update({ pages_used: usage.pages_used + pages })
    .eq('user_id', userId)

  return NextResponse.json({
    success: true,
    pages_remaining: 5 - (usage.pages_used + pages)
  })
}