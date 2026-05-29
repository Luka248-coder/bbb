import { NextRequest, NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE = 'https://api.themoviedb.org/3'

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') || 'trending'
  const type = request.nextUrl.searchParams.get('type') || 'movie' // 'movie' | 'tv'

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
  } catch (err) {
    console.error('TMDB recommendations error:', err)
    return NextResponse.json({ results: [] })
  }
}
