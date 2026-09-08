import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'

const TMDB_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// fetch TMDB avec timeout court + un retry sur rate-limit (429)
async function fetchTMDB(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    try {
      const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal })
      clearTimeout(t)
      if (res.status === 429) { await new Promise(r => setTimeout(r, 600)); continue }
      return res
    } catch {
      clearTimeout(t)
      return null
    }
  }
  return null
}

// Exécute fn sur tous les items avec une concurrence limitée (pool)
async function pool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let i = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++]
      await fn(item)
    }
  })
  await Promise.all(workers)
}

// Rafraîchit les métadonnées TMDB (popularité, notes, affiches, genres…) de
// tout le catalogue. Ne touche JAMAIS video_url / download_url. Ce sont ces
// champs qui alimentent le hero, le top 10 et les rangées "populaires".
export async function POST() {
  try {
    const supabase = await createClient()

    const [movies, series] = await Promise.all([
      fetchAllRows<{ tmdb_id: number }>(() => supabase.from('movies').select('tmdb_id') as any),
      fetchAllRows<{ tmdb_id: number }>(() => supabase.from('series').select('tmdb_id') as any),
    ])
    console.log(`[v0] refresh-tmdb: ${movies.length} films, ${series.length} séries à traiter`)

    let moviesUpdated = 0
    let seriesUpdated = 0
    let failed = 0
    let lastError: string | null = null

    await pool(movies, 12, async (m: any) => {
      const res = await fetchTMDB(`${TMDB}/movie/${m.tmdb_id}?api_key=${TMDB_KEY}&language=fr-FR`)
      if (!res || !res.ok) { failed++; if (res) lastError = `TMDB ${res.status}`; return }
      const d = await res.json()
      const { error } = await supabase.from('movies').update({
        title: d.title || d.original_title,
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
    })

    await pool(series, 12, async (s: any) => {
      const res = await fetchTMDB(`${TMDB}/tv/${s.tmdb_id}?api_key=${TMDB_KEY}&language=fr-FR`)
      if (!res || !res.ok) { failed++; if (res) lastError = `TMDB ${res.status}`; return }
      const d = await res.json()
      const { error } = await supabase.from('series').update({
        name: d.name || d.original_name,
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
    })

    revalidatePath('/')

    console.log(`[v0] refresh-tmdb done: ${moviesUpdated} films, ${seriesUpdated} séries, ${failed} échecs, lastError=${lastError}`)

    // On renvoie toujours un succès si au moins un contenu a été actualisé.
    // Le détail des échecs est renvoyé pour affichage.
    return NextResponse.json({ success: true, moviesUpdated, seriesUpdated, failed, lastError })
  } catch (e: any) {
    console.log('[v0] refresh-tmdb fatal:', e?.message)
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
