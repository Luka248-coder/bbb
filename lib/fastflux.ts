// SERVEUR UNIQUEMENT — ne pas importer dans des Client Components
import { createClient } from '@/lib/supabase/server'
import type { Movie, Series, Episode } from '@/lib/content-types'

export type { Movie, Series, Episode } from '@/lib/content-types'
export { GENRES, getGenreNames, getPosterUrl, getBackdropUrl } from '@/lib/content-types'

const PURSTREAM_BASE = 'https://api.purstream.ac/api/v1'

// ─── Helpers Purstream ────────────────────────────────────────────────────────

async function purstream_searchId(title: string, type: 'movie' | 'series', tmdbId?: number): Promise<number | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const results: any[] = await res.json()
    if (!Array.isArray(results) || results.length === 0) return null

    // Priorité : correspondance tmdb_id
    if (tmdbId) {
      const byTmdb = results.find(r => String(r.tmdb_id) === String(tmdbId))
      if (byTmdb?.id) return byTmdb.id
    }

    // Correspondance titre + type
    const norm = title.toLowerCase().trim()
    const isMovie = type === 'movie'
    const byTitle = results.find(r => {
      const rTitle = (r.title || r.name || '').toLowerCase().trim()
      const rType = r.type?.toLowerCase() || ''
      const typeOk = isMovie
        ? rType === 'movie' || rType === 'film'
        : rType === 'series' || rType === 'tv' || rType === 'show'
      return rTitle === norm && typeOk
    })
    if (byTitle?.id) return byTitle.id

    // Fallback premier résultat
    return results[0]?.id || null
  } catch {
    return null
  }
}

async function purstream_getMovieUrl(purstreamId: number): Promise<string | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const sheet = await res.json()

    if (sheet.sources && Array.isArray(sheet.sources) && sheet.sources.length > 0) {
      const mp4 = sheet.sources.find((s: any) => s.url?.includes('.mp4'))
      const m3u8 = sheet.sources.find((s: any) => s.url?.includes('.m3u8'))
      return mp4?.url || m3u8?.url || sheet.sources[0]?.url || null
    }
    return sheet.video_url || sheet.url || null
  } catch {
    return null
  }
}

async function purstream_getEpisodeUrl(purstreamId: number, season: number, episode: number): Promise<string | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const sheet = await res.json()

    if (sheet.episodes && Array.isArray(sheet.episodes)) {
      const ep = sheet.episodes.find((e: any) => e.season === season && e.episode === episode)
      if (ep) {
        if (ep.sources && ep.sources.length > 0) {
          const mp4 = ep.sources.find((s: any) => s.url?.includes('.mp4'))
          const m3u8 = ep.sources.find((s: any) => s.url?.includes('.m3u8'))
          return mp4?.url || m3u8?.url || ep.sources[0]?.url || null
        }
        return ep.video_url || null
      }
    }

    // Fallback source globale
    if (sheet.sources && Array.isArray(sheet.sources) && sheet.sources.length > 0) {
      const mp4 = sheet.sources.find((s: any) => s.url?.includes('.mp4'))
      const m3u8 = sheet.sources.find((s: any) => s.url?.includes('.m3u8'))
      return mp4?.url || m3u8?.url || sheet.sources[0]?.url || null
    }
    return null
  } catch {
    return null
  }
}

// ─── Fonctions publiques ──────────────────────────────────────────────────────

export async function getMovies(): Promise<Movie[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('popularity', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching movies:', error)
    return []
  }
}

export async function getSeries(): Promise<Series[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .order('popularity', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching series:', error)
    return []
  }
}

export async function getMovieById(tmdbId: number): Promise<Movie | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export async function getSeriesById(tmdbId: number): Promise<Series | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export async function getEpisodes(seriesId: number, seasonNumber?: number): Promise<Episode[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('episodes')
      .select('*')
      .eq('series_id', seriesId)
      .order('season_number')
      .order('episode_number')
    if (seasonNumber !== undefined) {
      query = query.eq('season_number', seasonNumber)
    }
    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching episodes:', error)
    return []
  }
}

export async function searchContent(query: string): Promise<{ movies: Movie[], series: Series[] }> {
  try {
    const supabase = await createClient()
    const search = `%${query}%`
    const [{ data: movies }, { data: series }] = await Promise.all([
      supabase.from('movies').select('*').ilike('title', search),
      supabase.from('series').select('*').ilike('name', search),
    ])
    return { movies: movies || [], series: series || [] }
  } catch (error) {
    console.error('Error searching content:', error)
    return { movies: [], series: [] }
  }
}

/**
 * Récupère l'URL vidéo d'un film.
 * 1. Cherche dans la BDD (catalog interne)
 * 2. Si absent ou sans video_url, tente Purstream comme fallback
 */
export async function getMovieVideoUrl(tmdbId: number, titleFallback?: string): Promise<string | null> {
  // 1. BDD
  const movie = await getMovieById(tmdbId)
  if (movie?.video_url) return movie.video_url

  // 2. Fallback Purstream
  const title = titleFallback || movie?.title || movie?.original_title
  if (!title) return null

  console.log(`[Purstream] Film introuvable en BDD, tentative Purstream: "${title}"`)
  const purstreamId = await purstream_searchId(title, 'movie', tmdbId)
  if (!purstreamId) return null

  return purstream_getMovieUrl(purstreamId)
}

/**
 * Récupère l'URL vidéo d'un épisode.
 * 1. Cherche dans la BDD (episodes)
 * 2. Si absent, tente Purstream comme fallback
 */
export async function getEpisodeVideoUrl(
  tmdbId: number,
  season: number,
  episode: number,
  titleFallback?: string
): Promise<string | null> {
  // 1. BDD
  try {
    const series = await getSeriesById(tmdbId)
    if (series) {
      const supabase = await createClient()
      const { data } = await supabase
        .from('episodes')
        .select('video_url')
        .eq('series_id', series.id)
        .eq('season_number', season)
        .eq('episode_number', episode)
        .single()

      if (data?.video_url) return data.video_url

      // 2. Fallback Purstream
      const title = titleFallback || series.name || series.original_name
      if (!title) return null

      console.log(`[Purstream] Épisode S${season}E${episode} introuvable, tentative Purstream: "${title}"`)
      const purstreamId = await purstream_searchId(title, 'series', tmdbId)
      if (!purstreamId) return null

      return purstream_getEpisodeUrl(purstreamId, season, episode)
    }
  } catch {
    // Série pas dans la BDD du tout
  }

  // Série inconnue localement → Purstream direct
  if (titleFallback) {
    const purstreamId = await purstream_searchId(titleFallback, 'series', tmdbId)
    if (!purstreamId) return null
    return purstream_getEpisodeUrl(purstreamId, season, episode)
  }

  return null
}
