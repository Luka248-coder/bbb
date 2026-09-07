import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const TMDB_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Traite un tableau par lots pour ne pas saturer TMDB
async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
  }
}

// Rafraîchit les métadonnées TMDB (popularité, notes, affiches, genres…) de
// tout le catalogue. Ne touche JAMAIS video_url / download_url. Ce sont ces
// champs qui alimentent le hero, le top 10 et les rangées "populaires".
export async function POST() {
  const supabase = await createClient()

  const [{ data: movies }, { data: series }] = await Promise.all([
    supabase.from('movies').select('tmdb_id'),
    supabase.from('series').select('tmdb_id'),
  ])

  let moviesUpdated = 0
  let seriesUpdated = 0
  let failed = 0

  await inBatches(movies || [], 8, async (m: any) => {
    try {
      const res = await fetch(`${TMDB}/movie/${m.tmdb_id}?api_key=${TMDB_KEY}&language=fr-FR`, { cache: 'no-store' })
      if (!res.ok) { failed++; return }
      const d = await res.json()
      const { error } = await supabase.from('movies').update({
        title: d.title,
        original_title: d.original_title || d.title,
        overview: d.overview || '',
        poster_path: d.poster_path,
        backdrop_path: d.backdrop_path,
        release_date: d.release_date,
        vote_average: d.vote_average || 0,
        vote_count: d.vote_count || 0,
        genre_ids: (d.genres || []).map((g: any) => g.id),
        popularity: d.popularity || 0,
        updated_at: new Date().toISOString(),
      }).eq('tmdb_id', m.tmdb_id)
      if (error) failed++; else moviesUpdated++
    } catch { failed++ }
  })

  await inBatches(series || [], 8, async (s: any) => {
    try {
      const res = await fetch(`${TMDB}/tv/${s.tmdb_id}?api_key=${TMDB_KEY}&language=fr-FR`, { cache: 'no-store' })
      if (!res.ok) { failed++; return }
      const d = await res.json()
      const { error } = await supabase.from('series').update({
        name: d.name,
        original_name: d.original_name || d.name,
        overview: d.overview || '',
        poster_path: d.poster_path,
        backdrop_path: d.backdrop_path,
        first_air_date: d.first_air_date,
        vote_average: d.vote_average || 0,
        vote_count: d.vote_count || 0,
        genre_ids: (d.genres || []).map((g: any) => g.id),
        popularity: d.popularity || 0,
        number_of_seasons: d.number_of_seasons || 1,
        number_of_episodes: d.number_of_episodes || 0,
        updated_at: new Date().toISOString(),
      }).eq('tmdb_id', s.tmdb_id)
      if (error) failed++; else seriesUpdated++
    } catch { failed++ }
  })

  // Rafraîchit la page d'accueil (hero, top 10, populaires…)
  revalidatePath('/')

  return NextResponse.json({ success: true, moviesUpdated, seriesUpdated, failed })
}
