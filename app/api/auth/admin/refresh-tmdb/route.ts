import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const TMDB_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// fetch avec timeout pour ne jamais bloquer indéfiniment
async function fetchTMDB(url: string) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    return await fetch(url, { cache: 'no-store', signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
  }
}

// Rafraîchit les métadonnées TMDB (popularité, notes, affiches, genres…) de
// tout le catalogue. Ne touche JAMAIS video_url / download_url. Ce sont ces
// champs qui alimentent le hero, le top 10 et les rangées "populaires".
export async function POST() {
  try {
    const supabase = await createClient()

    const [moviesRes, seriesRes] = await Promise.all([
      supabase.from('movies').select('tmdb_id'),
      supabase.from('series').select('tmdb_id'),
    ])

    if (moviesRes.error) {
      console.log('[v0] refresh-tmdb movies read error:', moviesRes.error.message)
      return NextResponse.json({ error: `Lecture films: ${moviesRes.error.message}` }, { status: 500 })
    }
    if (seriesRes.error) {
      console.log('[v0] refresh-tmdb series read error:', seriesRes.error.message)
      return NextResponse.json({ error: `Lecture séries: ${seriesRes.error.message}` }, { status: 500 })
    }

    const movies = moviesRes.data || []
    const series = seriesRes.data || []
    console.log(`[v0] refresh-tmdb: ${movies.length} films, ${series.length} séries`)

    let moviesUpdated = 0
    let seriesUpdated = 0
    let failed = 0
    let lastError: string | null = null

    await inBatches(movies, 6, async (m: any) => {
      try {
        const res = await fetchTMDB(`${TMDB}/movie/${m.tmdb_id}?api_key=${TMDB_KEY}&language=fr-FR`)
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
        if (error) { failed++; lastError = error.message } else moviesUpdated++
      } catch (e: any) { failed++; lastError = e?.message || 'fetch error' }
    })

    await inBatches(series, 6, async (s: any) => {
      try {
        const res = await fetchTMDB(`${TMDB}/tv/${s.tmdb_id}?api_key=${TMDB_KEY}&language=fr-FR`)
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
        if (error) { failed++; lastError = error.message } else seriesUpdated++
      } catch (e: any) { failed++; lastError = e?.message || 'fetch error' }
    })

    revalidatePath('/')

    console.log(`[v0] refresh-tmdb done: ${moviesUpdated} films, ${seriesUpdated} séries, ${failed} échecs`)

    // Si rien n'a pu être mis à jour et qu'il y avait du contenu, on remonte l'erreur
    if (moviesUpdated === 0 && seriesUpdated === 0 && (movies.length + series.length) > 0) {
      return NextResponse.json(
        { error: lastError || 'Aucune mise à jour effectuée', moviesUpdated, seriesUpdated, failed },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, moviesUpdated, seriesUpdated, failed })
  } catch (e: any) {
    console.log('[v0] refresh-tmdb fatal:', e?.message)
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
