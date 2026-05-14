import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const ticketId = request.nextUrl.searchParams.get('ticket_id')
  if (!ticketId) return NextResponse.json({ error: 'ticket_id manquant' }, { status: 400 })

  // Verify user owns ticket or is admin
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('user_id')
    .eq('id', ticketId)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
  if (!user.is_admin && ticket.user_id !== user.id) {
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
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const body = await request.json()
  const { ticket_id, message } = body

  if (!ticket_id || !message?.trim()) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  // Verify user owns ticket or is admin
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('user_id')
    .eq('id', ticket_id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
  if (!user.is_admin && ticket.user_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('support_messages')
    .insert({ ticket_id, user_id: user.id, is_admin: user.is_admin, message })
    .select(`*, users(username, avatar, discord_id)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update ticket updated_at + status
  const newStatus = user.is_admin ? 'answered' : 'open'
  await supabase
    .from('support_tickets')
    .update({ updated_at: new Date().toISOString(), status: newStatus })
    .eq('id', ticket_id)

  return NextResponse.json(data)
}