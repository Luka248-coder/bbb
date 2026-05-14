import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json([])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PATCH(request: NextRequest) {
  const { user_id, notification_id, mark_all } = await request.json()
  const supabase = await createClient()

  if (mark_all) {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user_id)
  } else {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notification_id)
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const user_id = request.nextUrl.searchParams.get('user_id')
  const notification_id = request.nextUrl.searchParams.get('id')
  const supabase = await createClient()

  if (notification_id) {
    await supabase.from('notifications').delete().eq('id', notification_id)
  } else if (user_id) {
    await supabase.from('notifications').delete().eq('user_id', user_id)
  }

  return NextResponse.json({ success: true })
}