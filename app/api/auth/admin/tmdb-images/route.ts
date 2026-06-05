import { NextRequest, NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') || 'movie'
  const id = request.nextUrl.searchParams.get('id')

  if (!id) return NextResponse.json({ backdrop_path: null })

  try {
    // Récupérer les images sans filtre de langue pour avoir plus de backdrops
    const res = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}/images?api_key=${TMDB_API_KEY}`
    )
    const data = await res.json()

    // Prendre le backdrop avec le meilleur vote_average (vrai fond de scène, pas logo)
    const backdrops = (data.backdrops || [])
      .filter((b: any) => b.aspect_ratio > 1.7) // ratio 16:9 = vrai backdrop
      .sort((a: any, b: any) => b.vote_average - a.vote_average)

    const bestBackdrop = backdrops[0]?.file_path || null

    return NextResponse.json({ backdrop_path: bestBackdrop })
  } catch (err) {
    console.error('TMDB images error:', err)
    return NextResponse.json({ backdrop_path: null })
  }
}
