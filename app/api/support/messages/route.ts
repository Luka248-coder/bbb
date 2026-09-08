import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { getSession, isStaff } from '@/lib/auth'
import { getClientIp } from '@/lib/geo-ip'

function db() {
  return getServiceClient()
}

function canAccess(ticket: { user_id: string | null; ip?: string | null }, user: { id: string } | null, staff: boolean, ip: string) {
  if (staff) return true
  if (user && ticket.user_id === user.id) return true
  if (!user && !ticket.user_id && ticket.ip === ip) return true
  return false
}

export async function GET(request: NextRequest) {
  const user = await getSession()
  const supabase = db() || await createClient()
  const ticketId = request.nextUrl.searchParams.get('ticket_id')
  const ip = getClientIp(request)
  if (!ticketId) return NextResponse.json({ error: 'ticket_id manquant' }, { status: 400 })

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('user_id, ip')
    .eq('id', ticketId)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
  if (!canAccess(ticket, user, isStaff(user), ip)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('support_messages')
    .select(`*, users(username, avatar, discord_id)`)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const user = await getSession()
  const supabase = db() || await createClient()
  const body = await request.json()
  const { ticket_id, message } = body
  const ip = getClientIp(request)

  if (!ticket_id || !message?.trim()) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('user_id, ip')
    .eq('id', ticket_id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
  if (!canAccess(ticket, user, isStaff(user), ip)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const staffReply = isStaff(user) && ticket.user_id !== user?.id
  const { data, error } = await supabase
    .from('support_messages')
    .insert({ ticket_id, user_id: user?.id || null, ip, is_admin: staffReply, message })
    .select(`*, users(username, avatar, discord_id)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const newStatus = staffReply ? 'answered' : 'open'
  await supabase
    .from('support_tickets')
    .update({ updated_at: new Date().toISOString(), status: newStatus })
    .eq('id', ticket_id)

  return NextResponse.json(data)
}
