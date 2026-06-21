import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Récupérer les avatars depuis la table profile_avatars
  const { data: avatars } = await supabase
    .from('profile_avatars')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  // Si pas encore d'avatars, retourner les posters des animes en DB comme fallback
  if (!avatars || avatars.length === 0) {
    const { data: series } = await supabase
      .from('series')
      .select('tmdb_id, name, poster_path')
      .not('poster_path', 'is', null)
      .limit(50)

    const fallback = (series || []).map(s => ({
      id: s.tmdb_id,
      tmdb_id: s.tmdb_id,
      title: s.name,
      image_url: `https://image.tmdb.org/t/p/w185${s.poster_path}`,
      character_name: null,
    }))

    return NextResponse.json(fallback)
  }

  return NextResponse.json(avatars)
}

// Admin : ajouter un avatar
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('profile_avatars')
    .insert({
      tmdb_id: body.tmdb_id,
      title: body.title,
      image_url: body.image_url,
      character_name: body.character_name || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
