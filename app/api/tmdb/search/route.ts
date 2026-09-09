import { NextRequest, NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  const rawType = request.nextUrl.searchParams.get('type') || 'movie'
  const type = rawType === 'series' || rawType === 'tv' ? 'tv' : 'movie'
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1)

  if (!q) return NextResponse.json({ results: [], page: 1, total_pages: 0, total_results: 0 })

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&language=fr-FR&include_adult=false&query=${encodeURIComponent(q)}&page=${page}`,
      { next: { revalidate: 120 } },
    )
    const data = await res.json()
    return NextResponse.json({
      results: data.results || [],
      page: data.page || page,
      total_pages: Math.min(data.total_pages || 0, 20),
      total_results: data.total_results || 0,
    })
  } catch (err) {
    console.error('TMDB search error:', err)
    return NextResponse.json({ results: [], page: 1, total_pages: 0, total_results: 0 })
  }
}
