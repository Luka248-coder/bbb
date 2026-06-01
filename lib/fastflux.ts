// SERVEUR UNIQUEMENT — ne pas importer dans des Client Components
import { createClient } from '@/lib/supabase/server'
import type { Movie, Series, Episode } from '@/lib/content-types'

export type { Movie, Series, Episode } from '@/lib/content-types'
export { GENRES, getGenreNames, getPosterUrl, getBackdropUrl } from '@/lib/content-types'

const PURSTREAM_BASE = 'https://api.purstream.ac/api/v1'

// ─── Helpers Purstream ────────────────────────────────────────────────────────

async function purstream_searchId(title: string, type: 'movie' | 'series', tmdbId?: number): Promise<number | null> {
  try {
    console.log(`[Purstream Search] "${title}" | Type: ${type} | TMDB: ${tmdbId}`)

    const res = await fetch(`${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`, {
      headers: { 
        Accept: 'application/json', 
        'User-Agent': 'Mozilla/5.0 (compatible; StreamSelf/1.0)' 
      },
      next: { revalidate: 1800 }, // 30 minutes
    })

    if (!res.ok) {
      console.log(`[Purstream] Erreur HTTP ${res.status}`)
      return null
    }

    const results: any[] = await res.json()

    if (!Array.isArray(results) || results.length === 0) {
      console.log(`[Purstream] Aucun résultat trouvé`)
      return null
    }

    // 1. Priorité absolue : match par TMDB ID
    if (tmdbId) {
      const byTmdb = results.find(r => 
        String(r.tmdb_id) === String(tmdbId) || 
        String(r.id) === String(tmdbId)
      )
      if (byTmdb?.id) {
        console.log(`[Purstream] ✅ Match TMDB ID trouvé: ${byTmdb.id}`)
        return byTmdb.id
      }
    }

    const normTitle = title.toLowerCase().trim().replace(/[:]/g, '')

    // 2. Match intelligent par titre
    for (const item of results) {
      const itemTitle = (item.title || item.name || '').toLowerCase().trim()
      const itemType = (item.type || item.media_type || '').toLowerCase()

      const typeOk = type === 'movie'
        ? ['movie', 'film'].includes(itemType)
        : ['series', 'tv', 'show', 'série', 'serie'].includes(itemType)

      if (typeOk && (
        itemTitle === normTitle ||
        itemTitle.includes(normTitle) ||
        normTitle.includes(itemTitle) ||
        itemTitle.replace(/[:]/g, '') === normTitle.replace(/[:]/g, '')
      )) {
        console.log(`[Purstream] ✅ Match titre trouvé: ${item.id} → ${itemTitle}`)
        return item.id
      }
    }

    // 3. Fallback : premier résultat (dernier recours)
    console.log(`[Purstream] ⚠️ Aucun match exact → fallback sur premier résultat: ${results[0].title || results[0].name}`)
    return results[0].id

  } catch (err) {
    console.error('[Purstream Search Error]', err)
    return null
  }
}

async function purstream_getMovieUrl(purstreamId: number): Promise<string | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 },
    })

    if (!res.ok) return null

    const sheet = await res.json()

    // Meilleure extraction des sources
    if (sheet.sources && Array.isArray(sheet.sources) && sheet.sources.length > 0) {
      const mp4 = sheet.sources.find((s: any) => s.url?.includes('.mp4'))
      const m3u8 = sheet.sources.find((s: any) => s.url?.includes('.m3u8') || s.url?.includes('master.m3u8'))
      return mp4?.url || m3u8?.url || sheet.sources[0]?.url || null
    }

    return sheet.stream_url || sheet.video_url || sheet.url || null
  } catch (err) {
    console.error('[purstream_getMovieUrl]', err)
    return null
  }
}

async function purstream_getEpisodeUrl(purstreamId: number, season: number, episode: number): Promise<string | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 },
    })

    if (!res.ok) return null

    const sheet = await res.json()

    // Recherche dans les épisodes
    if (sheet.episodes && Array.isArray(sheet.episodes)) {
      const ep = sheet.episodes.find((e: any) => 
        e.season === season && e.episode === episode
      )
      if (ep) {
        if (ep.sources && Array.isArray(ep.sources) && ep.sources.length > 0) {
          const mp4 = ep.sources.find((s: any) => s.url?.includes('.mp4'))
          const m3u8 = ep.sources.find((s: any) => s.url?.includes('.m3u8') || s.url?.includes('master.m3u8'))
          return mp4?.url || m3u8?.url || ep.sources[0]?.url || null
        }
        return ep.video_url || ep.url || null
      }
    }

    // Fallback sur les sources globales
    if (sheet.sources && Array.isArray(sheet.sources) && sheet.sources.length > 0) {
      const mp4 = sheet.sources.find((s: any) => s.url?.includes('.mp4'))
      const m3u8 = sheet.sources.find((s: any) => s.url?.includes('.m3u8') || s.url?.includes('master.m3u8'))
      return mp4?.url || m3u8?.url || sheet.sources[0]?.url || null
    }

    return sheet.stream_url || sheet.video_url || sheet.url || null
  } catch (err) {
    console.error('[purstream_getEpisodeUrl]', err)
    return null
  }
}

// ─── Fonctions publiques (inchangées sauf logs) ──────────────────────────────────────────────────────

export async function getMovies() { /* ... ton code existant ... */ }
export async function getSeries() { /* ... ton code existant ... */ }
export async function getMovieById() { /* ... */ }
export async function getSeriesById() { /* ... */ }
export async function getEpisodes() { /* ... */ }
export async function searchContent() { /* ... */ }

export async function getMovieVideoUrl(tmdbId: number, titleFallback?: string): Promise<string | null> {
  const movie = await getMovieById(tmdbId)
  if (movie?.video_url) return movie.video_url

  const title = titleFallback || movie?.title || movie?.original_title
  if (!title) return null

  console.log(`[Purstream Movie] Tentative pour TMDB ${tmdbId} - "${title}"`)
  const purstreamId = await purstream_searchId(title, 'movie', tmdbId)
  if (!purstreamId) return null

  return purstream_getMovieUrl(purstreamId)
}

export async function getEpisodeVideoUrl(
  tmdbId: number,
  season: number,
  episode: number,
  titleFallback?: string
): Promise<string | null> {
  // ... (je garde ta logique BDD + fallback)
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

      const title = titleFallback || series.name || series.original_name
      if (!title) return null

      console.log(`[Purstream Episode] S${season}E${episode} - "${title}"`)
      const purstreamId = await purstream_searchId(title, 'series', tmdbId)
      if (!purstreamId) return null

      return purstream_getEpisodeUrl(purstreamId, season, episode)
    }
  } catch {}

  // Fallback direct
  if (titleFallback) {
    console.log(`[Purstream Episode Direct] "${titleFallback}"`)
    const purstreamId = await purstream_searchId(titleFallback, 'series', tmdbId)
    if (!purstreamId) return null
    return purstream_getEpisodeUrl(purstreamId, season, episode)
  }

  return null
}
