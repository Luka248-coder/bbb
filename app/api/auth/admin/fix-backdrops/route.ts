import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

async function getBestBackdrop(type: 'movie' | 'tv', tmdbId: number): Promise<string | null> {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/${type}/${tmdbId}/images?api_key=${TMDB_API_KEY}`)
    const data = await res.json()
    const backdrops = (data.backdrops || [])
      .filter((b: any) => b.aspect_ratio > 1.7)
      .sort((a: any, b: any) => b.vote_average - a.vote_average)
    return backdrops[0]?.file_path || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const results = { movies: 0, series: 0, errors: 0 }

  // Fix movies
  const { data: movies } = await supabase.from('movies').select('id, tmdb_id, backdrop_path')
  if (movies) {
    for (const movie of movies) {
      const backdrop = await getBestBackdrop('movie', movie.tmdb_id)
      if (backdrop && backdrop !== movie.backdrop_path) {
        const { error } = await supabase
          .from('movies')
          .update({ backdrop_path: backdrop })
          .eq('id', movie.id)
        if (error) results.errors++
        else results.movies++
      }
      // Pause pour éviter le rate limit TMDB
      await new Promise(r => setTimeout(r, 250))
    }
  }

  // Fix series
  const { data: series } = await supabase.from('series').select('id, tmdb_id, backdrop_path')
  if (series) {
    for (const show of series) {
      const backdrop = await getBestBackdrop('tv', show.tmdb_id)
      if (backdrop && backdrop !== show.backdrop_path) {
        const { error } = await supabase
          .from('series')
          .update({ backdrop_path: backdrop })
          .eq('id', show.id)
        if (error) results.errors++
        else results.series++
      }
      await new Promise(r => setTimeout(r, 250))
    }
  }

  return NextResponse.json({ success: true, updated: results })
}
