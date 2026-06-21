import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const supabase = await createClient()
  const body = await request.json()

  // Max 5 profils par compte
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count || 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 profils par compte' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      name: body.name || 'Nouveau Profil',
      avatar_url: body.avatar_url || null,
      avatar_tmdb_id: body.avatar_tmdb_id || null,
      pin: body.pin || null,
      role: body.role || 'user',
      is_child: body.is_child || false,
      bio: body.bio || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const supabase = await createClient()
  const body = await request.json()
  const { id, ...updates } = body

  // Vérifier que le profil appartient à l'utilisateur
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!profile || profile.user_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const supabase = await createClient()
  const id = request.nextUrl.searchParams.get('id')

  // Vérifier que le profil appartient à l'utilisateur
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!profile || profile.user_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
