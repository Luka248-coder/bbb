import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profile_id')
  const userId = request.nextUrl.searchParams.get('user_id')

  if (!profileId && !userId) return NextResponse.json([])

  const supabase = await createClient()
  let query = supabase
    .from('watch_history')
    .select('id, tmdb_id, content_type, title, poster, season, episode, progress, watched_at')
    .order('watched_at', { ascending: false })
    .limit(50)

  if (profileId) query = query.eq('profile_id', profileId)
  else query = query.eq('user_id', userId!)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data || []).map(row => ({
      ...row,
      progress: row.progress ?? 0,
      finished: (row.progress ?? 0) >= 90,
    }))
  )
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { user_id, profile_id, tmdb_id, content_type, title, poster, season, episode, progress } = body

  if (!tmdb_id || !content_type || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // Chercher entrée existante par profile_id ou user_id
  let existingQuery = supabase
    .from('watch_history')
    .select('id')
    .eq('tmdb_id', tmdb_id)
    .eq('content_type', content_type)

  if (profile_id) existingQuery = existingQuery.eq('profile_id', profile_id)
  else if (user_id) existingQuery = existingQuery.eq('user_id', user_id)

  if (content_type === 'series' && season != null && episode != null) {
    existingQuery = existingQuery.eq('season', season).eq('episode', episode)
  }

  const { data: existing } = await existingQuery.maybeSingle()

  if (existing) {
    await supabase
      .from('watch_history')
      .update({ title, poster: poster ?? null, progress: progress ?? 0, watched_at: now })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('watch_history')
      .insert({
        user_id: user_id || null,
        profile_id: profile_id || null,
        tmdb_id, content_type, title,
        poster: poster ?? null,
        season: season ?? null,
        episode: episode ?? null,
        progress: progress ?? 0,
        watched_at: now,
      })
  }

  return NextResponse.json({ ok: true })
}
