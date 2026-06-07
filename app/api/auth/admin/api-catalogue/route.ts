import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TMDB_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'

// Add a TMDB item to catalogue without video URL (API mode)
export async function POST(req: NextRequest) {
  const { type, tmdbId } = await req.json()
  const supabase = await createClient()

  // Fetch full TMDB details
  const endpoint = type === 'movie' ? 'movie' : 'tv'
  const res = await fetch(`${TMDB}/${endpoint}/${tmdbId}?api_key=${TMDB_KEY}&language=fr-FR`)
  if (!res.ok) return NextResponse.json({ error: 'TMDB fetch failed' }, { status: 500 })
  const data = await res.json()

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
      adult: data.adult || false,
      video_url: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tmdb_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, title: data.title || data.name })
}

// Check if tmdb_id already in catalogue
export async function GET(req: NextRequest) {
  const tmdbId = req.nextUrl.searchParams.get('tmdbId')
  const type = req.nextUrl.searchParams.get('type') || 'movie'
  const supabase = await createClient()
  const table = type === 'movie' ? 'movies' : 'series'
  const { data } = await supabase.from(table).select('id').eq('tmdb_id', tmdbId).single()
  return NextResponse.json({ exists: !!data })
}
