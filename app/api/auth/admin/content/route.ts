import { after, NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

function sanitizeSearch(q: string) {
  return q.replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

async function notifyUsers(
  supabase: any,
  title: string,
  message: string,
  type: string,
  image_url: string | null,
  content_id: number,
  content_type: string,
  prefKey: string // 'new_movies' ou 'new_series'
) {
  try {
    const users = await fetchAllRows<{ id: string }>(() => supabase.from('users').select('id') as any)
    if (!users.length) return

    const prefs = await fetchAllRows<{ user_id: string; [k: string]: unknown }>(() =>
      supabase.from('notification_preferences').select(`user_id, ${prefKey}`) as any
    )
    const prefMap = new Map(prefs.map(p => [p.user_id, p[prefKey]]))

    const notifications = users
      .filter(user => prefMap.get(user.id) !== false)
      .map(user => ({
        user_id: user.id,
        title,
        message,
        type,
        image_url,
        content_id,
        content_type,
      }))

    for (let i = 0; i < notifications.length; i += 500) {
      await supabase.from('notifications').insert(notifications.slice(i, i + 500))
    }
  } catch (err) {
    console.error('[notifyUsers]', err)
  }
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') || 'movie'
  const q = sanitizeSearch(request.nextUrl.searchParams.get('q') || '')
  const page = Math.max(0, Number(request.nextUrl.searchParams.get('page') || 0) || 0)
  const pageSize = Math.min(80, Math.max(12, Number(request.nextUrl.searchParams.get('pageSize') || 48) || 48))
  const supabase = await createClient()
  const table = type === 'series' ? 'series' : 'movies'
  const columns = table === 'movies'
    ? 'id, tmdb_id, title, original_title, poster_path, vote_average, release_date, video_url'
    : 'id, tmdb_id, name, original_name, poster_path, vote_average, first_air_date, number_of_seasons'

  let query = supabase.from(table).select(columns, { count: 'exact' }).order('id', { ascending: false })
  if (q) {
    query = table === 'movies'
      ? query.or(`title.ilike.%${q}%,original_title.ilike.%${q}%`)
      : query.or(`name.ilike.%${q}%,original_name.ilike.%${q}%`)
  }

  const from = page * pageSize
  const { data, error, count } = await query.range(from, from + pageSize - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [], total: count || 0, page, pageSize })
}

export async function POST(request: NextRequest) {
  const { type, tmdbData, videoUrl } = await request.json()
  const supabase = await createClient()

  if (type === 'movie') {
    const { data, error } = await supabase
      .from('movies')
      .upsert({
        tmdb_id: tmdbData.id,
        title: tmdbData.title || tmdbData.original_title,
        original_title: tmdbData.original_title || tmdbData.title,
        overview: tmdbData.overview,
        poster_path: tmdbData.poster_path,
        backdrop_path: tmdbData.backdrop_path,
        release_date: tmdbData.release_date,
        vote_average: tmdbData.vote_average,
        vote_count: tmdbData.vote_count,
        genre_ids: tmdbData.genre_ids,
        popularity: tmdbData.popularity,
        updated_at: new Date().toISOString(),
        ...(videoUrl ? { video_url: videoUrl } : {}),
      }, { onConflict: 'tmdb_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const posterUrl = tmdbData.poster_path
      ? `https://image.tmdb.org/t/p/w185${tmdbData.poster_path}`
      : null

    after(() => notifyUsers(
      supabase,
      'Nouveau film disponible !',
      `"${tmdbData.title || tmdbData.original_title}" est maintenant disponible sur StreamSelf.`,
      'movie',
      posterUrl,
      tmdbData.id,
      'movie',
      'new_movies'
    ))

    return NextResponse.json(data)
  } else {
    const { data, error } = await supabase
      .from('series')
      .upsert({
        tmdb_id: tmdbData.id,
        name: tmdbData.name || tmdbData.original_name,
        original_name: tmdbData.original_name || tmdbData.name,
        overview: tmdbData.overview,
        poster_path: tmdbData.poster_path,
        backdrop_path: tmdbData.backdrop_path,
        first_air_date: tmdbData.first_air_date,
        vote_average: tmdbData.vote_average,
        vote_count: tmdbData.vote_count,
        genre_ids: tmdbData.genre_ids,
        popularity: tmdbData.popularity,
        number_of_seasons: tmdbData.number_of_seasons || 1,
        number_of_episodes: tmdbData.number_of_episodes || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tmdb_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const posterUrl = tmdbData.poster_path
      ? `https://image.tmdb.org/t/p/w185${tmdbData.poster_path}`
      : null

    after(() => notifyUsers(
      supabase,
      'Nouvelle série disponible !',
      `"${tmdbData.name || tmdbData.original_name}" est maintenant disponible sur StreamSelf.`,
      'series',
      posterUrl,
      tmdbData.id,
      'series',
      'new_series'
    ))

    return NextResponse.json(data)
  }
}

export async function PATCH(request: NextRequest) {
  const { type, tmdbId, videoUrl, downloadUrl } = await request.json()
  const supabase = await createClient()
  const table = type === 'movie' ? 'movies' : 'series'

  const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
  if (videoUrl !== undefined) updatePayload.video_url = videoUrl
  if (downloadUrl !== undefined) updatePayload.download_url = downloadUrl

  const { data, error } = await supabase
    .from(table)
    .update(updatePayload)
    .eq('tmdb_id', tmdbId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type')
  const tmdbId = request.nextUrl.searchParams.get('tmdbId')
  const supabase = await createClient()
  const table = type === 'movie' ? 'movies' : 'series'

  const { error } = await supabase.from(table).delete().eq('tmdb_id', tmdbId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}