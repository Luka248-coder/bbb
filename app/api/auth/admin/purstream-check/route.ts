import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TMDB_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'
const PURSTREAM_BASE = 'https://api.purstream.ch/api/v1'
const PURSTREAM_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://purstream.ch/',
  'Origin': 'https://purstream.ch',
}

// Fetch TMDB pages: trending + popular (until ~500 items)
async function fetchTmdbItems(type: 'movie' | 'series'): Promise<{ tmdb_id: number; title: string; popularity: number; poster_path: string | null; backdrop_path: string | null; overview: string; vote_average: number; vote_count: number; genre_ids: number[]; release_date?: string; first_air_date?: string; number_of_seasons?: number }[]> {
  const endpoint = type === 'movie' ? 'movie' : 'tv'
  const titleField = type === 'movie' ? 'title' : 'name'
  const items: any[] = []

  // 1. Trending week (page 1-5)
  for (let page = 1; page <= 5; page++) {
    try {
      const r = await fetch(`${TMDB}/trending/${endpoint}/week?api_key=${TMDB_KEY}&language=fr-FR&page=${page}`)
      if (!r.ok) break
      const d = await r.json()
      items.push(...(d.results || []))
    } catch {}
  }

  // 2. Popular (page 1-10)
  for (let page = 1; page <= 10; page++) {
    try {
      const r = await fetch(`${TMDB}/${endpoint}/popular?api_key=${TMDB_KEY}&language=fr-FR&page=${page}`)
      if (!r.ok) break
      const d = await r.json()
      items.push(...(d.results || []))
    } catch {}
  }

  // 3. Top rated (page 1-5)
  for (let page = 1; page <= 5; page++) {
    try {
      const r = await fetch(`${TMDB}/${endpoint}/top_rated?api_key=${TMDB_KEY}&language=fr-FR&page=${page}`)
      if (!r.ok) break
      const d = await r.json()
      items.push(...(d.results || []))
    } catch {}
  }

  // Deduplicate + sort by popularity
  const seen = new Set<number>()
  const unique = items.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true })
  unique.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))

  return unique.map(i => ({
    tmdb_id: i.id,
    title: i[titleField] || i.title || i.name || '',
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

async function checkPurstream(title: string, tmdbId: number, type: 'movie' | 'series'): Promise<boolean> {
  const endpoint = type === 'movie' ? 'movie' : 'tv'
  for (const url of [`${PURSTREAM_BASE}/media/tmdb/${tmdbId}`, `${PURSTREAM_BASE}/media/tmdb/${endpoint}/${tmdbId}`]) {
    try {
      const r = await fetch(url, { headers: PURSTREAM_HEADERS, signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        const d = await r.json()
        if (d?.data?.items?.id || d?.data?.id || d?.id) return true
      }
    } catch {}
  }
  try {
    const r = await fetch(`${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`, {
      headers: PURSTREAM_HEADERS, signal: AbortSignal.timeout(8000)
    })
    if (!r.ok) return false
    const d = await r.json()
    const si = d?.data?.items
    const results: any[] = si ? [...(si.movies?.items || []), ...(si.series?.items || [])] : (Array.isArray(d) ? d : [])
    return !!results.find((r: any) => String(r.tmdbId || r.tmdb_id) === String(tmdbId))?.id
  } catch { return false }
}

// GET: fetch pending items (TMDB items not yet in catalogue AND not yet checked)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const type = (req.nextUrl.searchParams.get('type') || 'movie') as 'movie' | 'series'
  const table = type === 'movie' ? 'movies' : 'series'

  // Get IDs already in catalogue
  const { data: catalogueItems } = await supabase.from(table).select('tmdb_id')
  const catalogueIds = new Set((catalogueItems || []).map((i: any) => i.tmdb_id))

  // Get already checked IDs
  const { data: checked } = await supabase.from('purstream_verified').select('tmdb_id').eq('content_type', type)
  const checkedIds = new Set((checked || []).map((i: any) => i.tmdb_id))

  // Fetch TMDB items
  const tmdbItems = await fetchTmdbItems(type)

  // Filter: not in catalogue AND not yet checked
  const pending = tmdbItems.filter(i => !catalogueIds.has(i.tmdb_id) && !checkedIds.has(i.tmdb_id))
  const alreadyInCatalogue = tmdbItems.filter(i => catalogueIds.has(i.tmdb_id)).length

  return NextResponse.json({
    total_tmdb: tmdbItems.length,
    in_catalogue: alreadyInCatalogue,
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

// POST: check one item on Purstream, add to catalogue if available
export async function POST(req: NextRequest) {
  const { tmdb_id, title, type } = await req.json()
  const supabase = await createClient()
  const table = type === 'movie' ? 'movies' : 'series'

  // Already in catalogue?
  const { data: inCatalogue } = await supabase.from(table).select('id').eq('tmdb_id', tmdb_id).single()
  if (inCatalogue) return NextResponse.json({ tmdb_id, status: 'already_in_catalogue' })

  // Already checked?
  const { data: alreadyChecked } = await supabase.from('purstream_verified').select('available').eq('tmdb_id', tmdb_id).eq('content_type', type).single()
  if (alreadyChecked) return NextResponse.json({ tmdb_id, status: 'already_checked', available: alreadyChecked.available })

  // Check Purstream
  const available = await checkPurstream(title, tmdb_id, type as 'movie' | 'series')

  // Save check result
  await supabase.from('purstream_verified').upsert({
    tmdb_id, content_type: type, available, checked_at: new Date().toISOString(),
  }, { onConflict: 'tmdb_id,content_type' })

  // If available → add to catalogue
  if (available) {
    const TMDB_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
    const endpoint = type === 'movie' ? 'movie' : 'tv'
    try {
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

  return NextResponse.json({ tmdb_id, title, available, status: available ? 'added_to_catalogue' : 'not_available' })
}

// DELETE: reset verification history
export async function DELETE(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const supabase = await createClient()
  if (type) await supabase.from('purstream_verified').delete().eq('content_type', type)
  else await supabase.from('purstream_verified').delete().neq('tmdb_id', 0)
  return NextResponse.json({ success: true })
}
