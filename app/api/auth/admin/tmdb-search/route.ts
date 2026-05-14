import { NextRequest, NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const type = request.nextUrl.searchParams.get('type') || 'movie'

  if (!q) return NextResponse.json({ results: [] })

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&language=fr-FR&query=${encodeURIComponent(q)}`
    )
    const data = await res.json()
    return NextResponse.json({ results: data.results || [] })
  } catch (err) {
    console.error('TMDB search error:', err)
    return NextResponse.json({ results: [] })
  }
}