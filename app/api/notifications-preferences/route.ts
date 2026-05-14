import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json(null)

  const supabase = await createClient()
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { user_id, ...prefs } = body
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id, ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}