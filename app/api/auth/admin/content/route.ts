import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  // Récupérer tous les users qui ont activé ce type de notif
  const { data: users } = await supabase
    .from('users')
    .select('id')

  if (!users || users.length === 0) return

  const notifications = []

  for (const user of users) {
    // Vérifier les préférences (par défaut true si pas de prefs)
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select(prefKey)
      .eq('user_id', user.id)
      .single()

    const enabled = prefs ? prefs[prefKey] !== false : true

    if (enabled) {
      notifications.push({
        user_id: user.id,
        title,
        message,
        type,
        image_url,
        content_id,
        content_type,
      })
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }
}

export async function POST(request: NextRequest) {
  const { type, tmdbData, videoUrl } = await request.json()
  const supabase = await createClient()

  if (type === 'movie') {
    const { data, error } = await supabase
      .from('movies')
      .upsert({
        tmdb_id: tmdbData.id,
        title: tmdbData.title,
        original_title: tmdbData.original_title || tmdbData.title,
        overview: tmdbData.overview,
        poster_path: tmdbData.poster_path,
        backdrop_path: tmdbData.backdrop_path,
        release_date: tmdbData.release_date,
        vote_average: tmdbData.vote_average,
        vote_count: tmdbData.vote_count,
        genre_ids: tmdbData.genre_ids,
        popularity: tmdbData.popularity,
        video_url: videoUrl || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tmdb_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const posterUrl = tmdbData.poster_path
      ? `https://image.tmdb.org/t/p/w185${tmdbData.poster_path}`
      : null

    await notifyUsers(
      supabase,
      'Nouveau film disponible !',
      `"${tmdbData.title}" est maintenant disponible sur StreamSelf.`,
      'movie',
      posterUrl,
      tmdbData.id,
      'movie',
      'new_movies'
    )

    return NextResponse.json(data)
  } else {
    const { data, error } = await supabase
      .from('series')
      .upsert({
        tmdb_id: tmdbData.id,
        name: tmdbData.name,
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

    await notifyUsers(
      supabase,
      'Nouvelle série disponible !',
      `"${tmdbData.name}" est maintenant disponible sur StreamSelf.`,
      'series',
      posterUrl,
      tmdbData.id,
      'series',
      'new_series'
    )

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