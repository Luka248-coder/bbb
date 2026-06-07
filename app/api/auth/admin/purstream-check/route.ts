import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TMDB_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'
const PURSTREAM_BASE = 'https://api.purstream.ch/api/v1'
const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://purstream.ch/',
  'Origin': 'https://purstream.ch',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
}

// Exactement la même logique que /api/purstream/route.ts qui marche
async function checkPurstream(title: string, tmdbId: number, type: 'movie' | 'series'): Promise<boolean> {
  try {
    // 1. Recherche par titre (comme le player le fait)
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

    // 2. Match: tmdbId exact → titre exact → premier résultat (comme le player)
    let match: any
    match = results.find((r: any) => String(r.tmdbId || r.tmdb_id) === String(tmdbId))
    if (!match) {
      const norm = title.toLowerCase().trim()
      match = results.find((r: any) => (r.title || r.name || '').toLowerCase().trim() === norm)
    }
    if (!match) match = results[0] // fallback: premier résultat

    return !!(match?.id)
  } catch {
    return false
  }
}

async function fetchTmdbItems(type: 'movie' | 'series') {
  const endpoint = type === 'movie' ? 'movie' : 'tv'
  const titleField = type === 'movie' ? 'title' : 'name'
  const items: any[] = []

  const sources = [
    `${TMDB}/trending/${endpoint}/week?api_key=${TMDB_KEY}&language=fr-FR`,
    `${TMDB}/${endpoint}/popular?api_key=${TMDB_KEY}&language=fr-FR`,
    `${TMDB}/${endpoint}/top_rated?api_key=${TMDB_KEY}&language=fr-FR`,
  ]

  for (const base of sources) {
    for (let page = 1; page <= 5; page++) {
      try {
        const r = await fetch(`${base}&page=${page}`)
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
      backdrop_path: i.backdrop_path || null,
      overview: i.overview || '',
      vote_average: i.vote_average || 0,
      vote_count: i.vote_count || 0,
      genre_ids: i.genre_ids || [],
      release_date: i.release_date,
      first_air_date: i.first_air_date,
    }))
}

// GET: pending items (TMDB items not in catalogue and not checked yet)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const type = (req.nextUrl.searchParams.get('type') || 'movie') as 'movie' | 'series'
  const table = type === 'movie' ? 'movies' : 'series'

  const [{ data: catalogueItems }, { data: checked }] = await Promise.all([
    supabase.from(table).select('tmdb_id'),
    supabase.from('purstream_verified').select('tmdb_id').eq('content_type', type),
  ])

  const catalogueIds = new Set((catalogueItems || []).map((i: any) => i.tmdb_id))
  const checkedIds = new Set((checked || []).map((i: any) => i.tmdb_id))

  const tmdbItems = await fetchTmdbItems(type)
  const pending = tmdbItems.filter(i => !catalogueIds.has(i.tmdb_id) && !checkedIds.has(i.tmdb_id))

  return NextResponse.json({
    total_tmdb: tmdbItems.length,
    in_catalogue: tmdbItems.filter(i => catalogueIds.has(i.tmdb_id)).length,
    already_checked: tmdbItems.filter(i => checkedIds.has(i.tmdb_id) && !catalogueIds.has(i.tmdb_id)).length,
    pending: pending.length,
    items: pending.slice(0, 500).map(i => ({
      tmdb_id: i.tmdb_id,
      title: i.title,
      popularity: i.popularity,
      poster_path: i.poster_path,
    }))
  })
}

// POST: check one item, auto-add to catalogue if available
export async function POST(req: NextRequest) {
  const { tmdb_id, title, type } = await req.json()
  const supabase = await createClient()
  const table = type === 'movie' ? 'movies' : 'series'

  // Skip if already in catalogue
  const { data: inCat } = await supabase.from(table).select('id').eq('tmdb_id', tmdb_id).single()
  if (inCat) return NextResponse.json({ tmdb_id, status: 'already_in_catalogue' })

  // Skip if already checked
  const { data: prevCheck } = await supabase.from('purstream_verified')
    .select('available').eq('tmdb_id', tmdb_id).eq('content_type', type).single()
  if (prevCheck) return NextResponse.json({ tmdb_id, status: 'already_checked', available: prevCheck.available })

  const available = await checkPurstream(title, tmdb_id, type as 'movie' | 'series')

  // Save result
  await supabase.from('purstream_verified').upsert({
    tmdb_id, content_type: type, available, checked_at: new Date().toISOString(),
  }, { onConflict: 'tmdb_id,content_type' })

  // Auto-add to catalogue if available
  if (available) {
    try {
      const endpoint = type === 'movie' ? 'movie' : 'tv'
      const res = await fetch(`${TMDB}/${endpoint}/${tmdb_id}?api_key=${TMDB_KEY}&language=fr-FR`)
      if (res.ok) {
        const data = await res.json()
        if (type === 'movie') {
          await supabase.from('movies').upsert({
            tmdb_id: data.id, title: data.title,
            original_title: data.original_title || data.title,
            overview: data.overview || '', poster_path: data.poster_path,
            backdrop_path: data.backdrop_path, release_date: data.release_date,
            vote_average: data.vote_average || 0, vote_count: data.vote_count || 0,
            genre_ids: (data.genres || []).map((g: any) => g.id),
            popularity: data.popularity || 0, adult: false, video_url: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'tmdb_id' })
        } else {
          await supabase.from('series').upsert({
            tmdb_id: data.id, name: data.name,
            original_name: data.original_name || data.name,
            overview: data.overview || '', poster_path: data.poster_path,
            backdrop_path: data.backdrop_path, first_air_date: data.first_air_date,
            vote_average: data.vote_average || 0, vote_count: data.vote_count || 0,
            genre_ids: (data.genres || []).map((g: any) => g.id),
            popularity: data.popularity || 0,
            number_of_seasons: data.number_of_seasons || 1,
            number_of_episodes: data.number_of_episodes || 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'tmdb_id' })
        }
      }
    } catch {}
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
