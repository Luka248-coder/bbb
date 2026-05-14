import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5')

  if (!userId) return NextResponse.json([])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('watch_history')
    .select('id, tmdb_id, content_type, title, poster, season, episode, progress, watched_at')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    content_id: row.tmdb_id,
    content_type: row.content_type,
    title: row.title,
    poster_url: row.poster ?? null,
    season: row.season ?? null,
    episode: row.episode ?? null,
    progress: row.progress ?? 0,
    finished: (row.progress ?? 0) >= 90,
    watched_at: row.watched_at,
  }))

  return NextResponse.json(mapped)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { user_id, tmdb_id, content_type, title, poster, season, episode, progress } = body

  if (!user_id || !tmdb_id || !content_type || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // NULL-safe lookup
  let query = supabase
    .from('watch_history')
    .select('id')
    .eq('user_id', user_id)
    .eq('tmdb_id', tmdb_id)
    .eq('content_type', content_type)

  query = season != null ? query.eq('season', season) : query.is('season', null)
  query = episode != null ? query.eq('episode', episode) : query.is('episode', null)

  const { data: existing } = await query.maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('watch_history')
      .update({ title, poster: poster ?? null, progress: progress ?? 0, watched_at: now })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('watch_history')
      .insert({
        user_id, tmdb_id, content_type, title,
        poster: poster ?? null,
        season: season ?? null,
        episode: episode ?? null,
        progress: progress ?? 0,
        watched_at: now,
      })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}