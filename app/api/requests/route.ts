import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')
  const supabase = await createClient()

  let query = supabase
    .from('content_requests')
    .select('*, user:users(username, avatar)')
    .order('created_at', { ascending: false })

  if (userId) query = (query as any).eq('user_id', userId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { title, content_type, description, user_id, tmdb_id, poster } = await request.json()

  if (!title || !content_type || !user_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('content_requests')
    .insert({ user_id, title, content_type, description, tmdb_id, poster })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { id, status } = await request.json()

  if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: req } = await supabase.from('content_requests').select('*').eq('id', id).single()

  const { data, error } = await supabase
    .from('content_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifier l'utilisateur
  if (req) {
    const isApproved = status === 'approved'
    await supabase.from('notifications').insert({
      user_id: req.user_id,
      title: isApproved ? 'Demande acceptée !' : ' Demande refusée',
      message: isApproved
        ? `Votre demande "${req.title}" a été acceptée et sera bientôt disponible !`
        : `Votre demande "${req.title}" n'a pas pu être acceptée pour le moment.`,
      type: 'request',
      image_url: req.poster ? `https://image.tmdb.org/t/p/w185${req.poster}` : null,
      content_type: req.content_type,
    })
  }

  return NextResponse.json(data)
}