import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { getSession, isStaff } from '@/lib/auth'
import { getClientIp } from '@/lib/geo-ip'

function db() {
  return getServiceClient()
}

export async function GET(request: NextRequest) {
  const user = await getSession()
  const staff = isStaff(user)
  const mine = request.nextUrl.searchParams.get('mine') === '1'
  const userId = request.nextUrl.searchParams.get('user_id')
  const ip = getClientIp(request)
  const supabase = db() || await createClient()

  if (!user && !staff) {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`*, users(username, avatar, discord_id), support_messages(count)`)
      .eq('ip', ip)
      .is('user_id', null)
      .order('updated_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let query = supabase
    .from('support_tickets')
    .select(`*, users(username, avatar, discord_id), support_messages(count)`)
    .order('updated_at', { ascending: false })

  if (!staff || mine) {
    query = query.eq('user_id', user.id)
  } else if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const user = await getSession()
  const supabase = db() || await createClient()
  const body = await request.json()
  const { category, subject, message } = body
  const ip = getClientIp(request)

  if (!category || !subject || !message) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({ user_id: user?.id || null, ip, category, subject })
    .select()
    .single()

  if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 500 })

  const { error: msgError } = await supabase
    .from('support_messages')
    .insert({ ticket_id: ticket.id, user_id: user?.id || null, ip, is_admin: false, message })

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })

  return NextResponse.json(ticket)
}

export async function PATCH(request: NextRequest) {
  const user = await getSession()
  if (!user || !isStaff(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = db() || await createClient()
  const body = await request.json()
  const { ticketId, status } = body

  const { error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
