import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TMDB_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'
const PURSTREAM_BASE = 'https://api.purstream.mx/api/v1'
const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://purstream.mx/',
  'Origin': 'https://purstream.mx',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
}

async function checkPurstream(title: string, tmdbId: number, type: 'movie' | 'series'): Promise<boolean> {
  try {
    const searchRes = await fetch(
      `${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`,
      { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(10000) }
    )
    if (!searchRes.ok) return false

    const searchJson = await searchRes.json()
    let results: any[] = []
    const si = searchJson?.data?.items
    if (si) {
      const movieItems = si.movies?.items || si.movie?.items || []
      const seriesItems = si.series?.items || si.serie?.items || []
      results = type === 'movie'
        ? [...movieItems, ...seriesItems]
        : [...seriesItems, ...movieItems]
    } else if (Array.isArray(searchJson)) {
      results = searchJson
    }

    if (results.length === 0) return false

    let match: any
    match = results.find((r: any) => String(r.tmdbId || r.tmdb_id) === String(tmdbId))
    if (!match) {
      const norm = title.toLowerCase().trim()
      match = results.find((r: any) => (r.title || r.name || '').toLowerCase().trim() === norm)
    }
    if (!match) match = results[0]

    return !!(match?.id)
  } catch {
    return false
  }
}

// Sources standard (trending + popular + top_rated)
const STANDARD_SOURCES = (endpoint: string) => [
  `${TMDB}/trending/${endpoint}/week`,
  `${TMDB}/${endpoint}/popular`,
  `${TMDB}/${endpoint}/top_rated`,
]

// Sources étendues (+ now_playing/on_the_air + upcoming + by genre)
const EXTENDED_SOURCES = (endpoint: string) => [
  `${TMDB}/trending/${endpoint}/week`,
  `${TMDB}/trending/${endpoint}/day`,
  `${TMDB}/${endpoint}/popular`,
  `${TMDB}/${endpoint}/top_rated`,
  ...(endpoint === 'movie'
    ? [
        `${TMDB}/movie/now_playing`,
        `${TMDB}/movie/upcoming`,
        `${TMDB}/discover/movie?sort_by=revenue.desc`,
        `${TMDB}/discover/movie?sort_by=vote_count.desc`,
        `${TMDB}/discover/movie?with_genres=28`,   // Action
        `${TMDB}/discover/movie?with_genres=35`,   // Comédie
        `${TMDB}/discover/movie?with_genres=18`,   // Drame
        `${TMDB}/discover/movie?with_genres=27`,   // Horreur
        `${TMDB}/discover/movie?with_genres=878`,  // SF
        `${TMDB}/discover/movie?with_genres=16`,   // Animation
        `${TMDB}/discover/movie?with_genres=12`,   // Aventure
        `${TMDB}/discover/movie?with_genres=53`,   // Thriller
      ]
    : [
        `${TMDB}/tv/on_the_air`,
        `${TMDB}/tv/airing_today`,
        `${TMDB}/discover/tv?sort_by=vote_count.desc`,
        `${TMDB}/discover/tv?sort_by=popularity.desc`,
        `${TMDB}/discover/tv?with_genres=18`,      // Drame
        `${TMDB}/discover/tv?with_genres=35`,      // Comédie
        `${TMDB}/discover/tv?with_genres=10765`,   // SF & Fantasy
        `${TMDB}/discover/tv?with_genres=80`,      // Crime
        `${TMDB}/discover/tv?with_genres=16`,      // Animation
        `${TMDB}/discover/tv?with_genres=9648`,    // Mystère
      ]
  ),
]

async function fetchTmdbItems(type: 'movie' | 'series', extended = false) {
  const endpoint = type === 'movie' ? 'movie' : 'tv'
  const titleField = type === 'movie' ? 'title' : 'name'
  const items: any[] = []

  const sources = extended ? EXTENDED_SOURCES(endpoint) : STANDARD_SOURCES(endpoint)

  for (const base of sources) {
    const sep = base.includes('?') ? '&' : '?'
    for (let page = 1; page <= 5; page++) {
      try {
        const r = await fetch(`${base}${sep}api_key=${TMDB_KEY}&language=fr-FR&page=${page}`)
        if (!r.ok) break
        const d = await r.json()
        if (!d.results?.length) break
        items.push(...d.results)
        if (page >= d.total_pages) break
      } catch {}
    }
  }

  const seen = new Set<number>()
  return items
    .filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true })
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .map(i => ({
      tmdb_id: i.id,
      title: i[titleField] || '',
      popularity: i.popularity || 0,
      poster_path: i.poster_path || null,
    }))
}

// GET: stats + pending items
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const type = (req.nextUrl.searchParams.get('type') || 'movie') as 'movie' | 'series'
  const extended = req.nextUrl.searchParams.get('extended') === 'true'
  const table = type === 'movie' ? 'movies' : 'series'

  const [{ data: catalogueItems }, { data: checked }] = await Promise.all([
    supabase.from(table).select('tmdb_id'),
    supabase.from('purstream_verified').select('tmdb_id').eq('content_type', type),
  ])

  const catalogueIds = new Set((catalogueItems || []).map((i: any) => i.tmdb_id))
  const checkedIds = new Set((checked || []).map((i: any) => i.tmdb_id))

  const tmdbItems = await fetchTmdbItems(type, extended)
  const pending = tmdbItems.filter(i => !catalogueIds.has(i.tmdb_id) && !checkedIds.has(i.tmdb_id))

  return NextResponse.json({
    total_tmdb: tmdbItems.length,
    in_catalogue: tmdbItems.filter(i => catalogueIds.has(i.tmdb_id)).length,
    already_checked: tmdbItems.filter(i => checkedIds.has(i.tmdb_id) && !catalogueIds.has(i.tmdb_id)).length,
    pending: pending.length,
    extended,
    items: pending.slice(0, 1000).map(i => ({
      tmdb_id: i.tmdb_id,
      title: i.title,
      popularity: i.popularity,
      poster_path: i.poster_path,
    }))
  })
}

// POST: check one item, auto-add to catalogue if available on Purstream
export async function POST(req: NextRequest) {
  const { tmdb_id, title, type } = await req.json()
  const supabase = await createClient()
  const table = type === 'movie' ? 'movies' : 'series'

  const { data: inCat } = await supabase.from(table).select('id').eq('tmdb_id', tmdb_id).single()
  if (inCat) return NextResponse.json({ tmdb_id, status: 'already_in_catalogue', available: true })

  const { data: prevCheck } = await supabase.from('purstream_verified')
    .select('available').eq('tmdb_id', tmdb_id).eq('content_type', type).single()
  if (prevCheck) return NextResponse.json({ tmdb_id, status: 'already_checked', available: prevCheck.available })

  const available = await checkPurstream(title, tmdb_id, type as 'movie' | 'series')

  await supabase.from('purstream_verified').upsert(
    { tmdb_id, content_type: type, available, checked_at: new Date().toISOString() },
    { onConflict: 'tmdb_id,content_type' }
  )

  if (available) {
    const endpoint = type === 'movie' ? 'movie' : 'tv'
    const tmdbRes = await fetch(`${TMDB}/${endpoint}/${tmdb_id}?api_key=${TMDB_KEY}&language=fr-FR`)
    if (!tmdbRes.ok) {
      return NextResponse.json({ tmdb_id, title, available, status: 'added_failed', error: 'TMDB fetch failed' })
    }
    const data = await tmdbRes.json()

    if (type === 'movie') {
      const { error } = await supabase.from('movies').upsert({
        tmdb_id: data.id,
        title: data.title,
        original_title: data.original_title || data.title,
        overview: data.overview || '',
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        release_date: data.release_date,
        vote_average: data.vote_average || 0,
        vote_count: data.vote_count || 0,
        genre_ids: (data.genres || []).map((g: any) => g.id),
        popularity: data.popularity || 0,
        video_url: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tmdb_id' })
      if (error) {
        console.error('[purstream-check] movie upsert error:', error.message)
        return NextResponse.json({ tmdb_id, title, available, status: 'added_failed', error: error.message })
      }
    } else {
      const { error } = await supabase.from('series').upsert({
        tmdb_id: data.id,
        name: data.name,
        original_name: data.original_name || data.name,
        overview: data.overview || '',
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        first_air_date: data.first_air_date,
        vote_average: data.vote_average || 0,
        vote_count: data.vote_count || 0,
        genre_ids: (data.genres || []).map((g: any) => g.id),
        popularity: data.popularity || 0,
        number_of_seasons: data.number_of_seasons || 1,
        number_of_episodes: data.number_of_episodes || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tmdb_id' })
      if (error) {
        console.error('[purstream-check] series upsert error:', error.message)
        return NextResponse.json({ tmdb_id, title, available, status: 'added_failed', error: error.message })
      }
    }
  }

  return NextResponse.json({ tmdb_id, title, available, status: available ? 'added' : 'not_found' })
}

// DELETE: reset verification history
export async function DELETE(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const supabase = await createClient()
  if (type) await supabase.from('purstream_verified').delete().eq('content_type', type)
  else await supabase.from('purstream_verified').delete().neq('tmdb_id', 0)
  return NextResponse.json({ success: true })
}
