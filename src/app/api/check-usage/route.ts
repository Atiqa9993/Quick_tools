import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  // Verify the user's identity server-side instead of trusting client-sent user_id
  const user = await getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required. Please log in.' },
      { status: 401 }
    )
  }

  const userId = user.id
  const supabase = createSupabaseAdmin()

  // Find existing usage record or create one
  let { data: usage } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!usage) {
    const { data: newUsage } = await supabase
      .from('usage')
      .insert({ user_id: userId, pages_used: 0, is_pro: false })
      .select()
      .single()
    usage = newUsage
  }

  // Daily reset check
  const today = new Date().toISOString().split('T')[0]
  if (usage.last_reset !== today && !usage.is_pro) {
    await supabase
      .from('usage')
      .update({ pages_used: 0, last_reset: today })
      .eq('user_id', userId)
    usage.pages_used = 0
  }

  return NextResponse.json({
    is_pro: usage.is_pro,
    pages_used: usage.pages_used,
    pages_remaining: usage.is_pro ? 999 : Math.max(0, 5 - usage.pages_used)
  })
}