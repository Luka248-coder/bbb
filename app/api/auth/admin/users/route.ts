import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const admin = await getSession()
  if (!admin?.is_admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const userId = request.nextUrl.searchParams.get('id')

  if (userId) {
    const [userRes, historyRes, favRes, requestsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('watch_history').select('*').eq('user_id', userId).order('watched_at', { ascending: false }).limit(10),
      supabase.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('content_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ])
    return NextResponse.json({
      user: userRes.data,
      history: historyRes.data || [],
      favorites: favRes.data || [],
      requests: requestsRes.data || [],
    })
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, discord_id, username, avatar, email, is_admin, is_banned, is_disabled, disabled_reason, role, last_ip, last_seen, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const admin = await getSession()
  if (!admin?.is_admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const body = await request.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (fields.role !== undefined) {
    updates.role = fields.role
    updates.is_admin = fields.role === 'admin'
  }

  const allowed = ['is_admin', 'is_banned', 'is_disabled', 'disabled_reason']
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }

  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const admin = await getSession()
  if (!admin?.is_admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const action = request.nextUrl.searchParams.get('action')
  const id = request.nextUrl.searchParams.get('id')
  const ip = request.nextUrl.searchParams.get('ip')

  if (action === 'ban_ip' && ip) {
    const { error } = await supabase.from('ip_bans').upsert({ ip, banned_by: admin.id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'unban_ip' && ip) {
    const { error } = await supabase.from('ip_bans').delete().eq('ip', ip)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (id) {
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}