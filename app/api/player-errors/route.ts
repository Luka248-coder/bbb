import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const TMDB_API_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[player-errors] Missing env vars', { url: !!url, key: !!key })
    return null
  }
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function getPosterUrl(tmdbId: number, contentType: string): Promise<string | null> {
  try {
    const endpoint = contentType === 'movie'
      ? `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`
      : `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`

    const res = await fetch(endpoint, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    const path = data.poster_path
    if (!path) return null
    return `https://image.tmdb.org/t/p/w342${path}`
  } catch {
    return null
  }
}

async function notifyAdmins(
  supabase: ReturnType<typeof getServiceClient>,
  title: string,
  posterUrl: string | null,
  tmdbId: number | null,
  contentType: string,
) {
  if (!supabase) return

  // Récupère tous les admins
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('is_admin', true)

  if (!admins || admins.length === 0) return

  const label = contentType === 'series' ? 'la série' : 'le film'
  const notifications = admins.map((admin: { id: string }) => ({
    user_id: admin.id,
    title: `⚠️ Erreur de lecture`,
    message: `Erreur avec ${label} "${title}"`,
    type: 'error',
    image_url: posterUrl ?? null,
    content_id: tmdbId ? String(tmdbId) : null,
    content_type: contentType,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)
  if (error) console.error('[player-errors] Notification insert error:', JSON.stringify(error))
  else console.log(`[player-errors] Notified ${admins.length} admin(s)`)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tmdb_id, content_type, title, season, episode } = body
    console.log('[player-errors] POST received', { tmdb_id, content_type, title, season, episode })

    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 })

    const { error } = await supabase.from('player_errors').insert({
      tmdb_id: tmdb_id ?? null,
      content_type: content_type ?? 'unknown',
      title: title ?? '',
      season: season ?? null,
      episode: episode ?? null,
    })

    if (error) {
      console.error('[player-errors] Supabase insert error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[player-errors] Inserted successfully')

    // Envoie une notification aux admins en arrière-plan
    const displayTitle = title ?? 'Inconnu'
    const posterUrl = tmdb_id ? await getPosterUrl(tmdb_id, content_type ?? 'movie') : null
    await notifyAdmins(supabase, displayTitle, posterUrl, tmdb_id ?? null, content_type ?? 'movie')

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[player-errors] Unexpected error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json([])

    const { data, error } = await supabase
      .from('player_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[player-errors] GET error:', JSON.stringify(error))
      return NextResponse.json([])
    }

    return NextResponse.json(data || [])
  } catch (e) {
    console.error('[player-errors] GET error:', e)
    return NextResponse.json([])
  }
}
