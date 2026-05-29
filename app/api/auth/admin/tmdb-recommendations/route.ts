import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE = 'https://api.themoviedb.org/3'

export async function GET(request: NextRequest) {
  const catalog = request.nextUrl.searchParams.get('catalog')

  // Return existing catalog IDs
  if (catalog === '1') {
    try {
      const supabase = await createClient()
      const [{ data: movies }, { data: series }] = await Promise.all([
        supabase.from('movies').select('tmdb_id'),
        supabase.from('series').select('tmdb_id'),
      ])
      return NextResponse.json({
        movieIds: (movies || []).map(m => m.tmdb_id),
        seriesIds: (series || []).map(s => s.tmdb_id),
      })
    } catch {
      return NextResponse.json({ movieIds: [], seriesIds: [] })
    }
  }

  // Return TMDB recommendations
  const category = request.nextUrl.searchParams.get('category') || 'trending'
  const type = request.nextUrl.searchParams.get('type') || 'movie'

  let url = ''
  if (category === 'trending') {
    url = `${TMDB_BASE}/trending/${type}/week?api_key=${TMDB_API_KEY}&language=fr-FR`
  } else if (category === 'top_rated') {
    url = `${TMDB_BASE}/${type}/top_rated?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`
  } else if (category === 'popular') {
    url = `${TMDB_BASE}/${type}/popular?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`
  } else if (category === 'upcoming') {
    url = `${TMDB_BASE}/movie/upcoming?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`
  }

  if (!url) return NextResponse.json({ results: [] })

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()
    return NextResponse.json({ results: (data.results || []).slice(0, 20) })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
