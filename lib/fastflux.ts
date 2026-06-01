// SERVEUR UNIQUEMENT — ne pas importer dans des Client Components
import { createClient } from '@/lib/supabase/server'
import type { Movie, Series, Episode } from '@/lib/content-types'

export type { Movie, Series, Episode } from '@/lib/content-types'
export { GENRES, getGenreNames, getPosterUrl, getBackdropUrl } from '@/lib/content-types'

const PURSTREAM_BASE = 'https://api.purstream.ac/api/v1'

// ─── Recherche Purstream ────────────────────────────────────────────────────────
async function purstream_searchId(title: string, type: 'movie' | 'series', tmdbId?: number): Promise<number | null> {
  try {
    console.log(`[Purstream Search] "${title}" | Type: ${type} | TMDB: ${tmdbId}`)

    const res = await fetch(`${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`, {
      headers: { 
        Accept: 'application/json', 
        'User-Agent': 'Mozilla/5.0 (compatible; StreamSelf/1.0)' 
      },
      next: { revalidate: 1800 },
    })

    if (!res.ok) {
      console.log(`[Purstream Search] Erreur HTTP ${res.status}`)
      return null
    }

    const responseData = await res.json()
    
    let results: any[] = []
    if (responseData?.data?.items?.movies?.items) {
      results = responseData.data.items.movies.items
    } else if (responseData?.data?.items?.series?.items) {
      results = responseData.data.items.series.items
    } else if (responseData?.data?.items) {
      results = Array.isArray(responseData.data.items) ? responseData.data.items : []
    } else if (Array.isArray(responseData)) {
      results = responseData
    }

    if (results.length === 0) {
      console.log(`[Purstream Search] Aucun résultat`)
      return null
    }

    console.log(`[Purstream Search] ${results.length} résultats trouvés`)

    if (tmdbId) {
      const byTmdb = results.find(r => 
        String(r.tmdb_id) === String(tmdbId) || String(r.id) === String(tmdbId)
      )
      if (byTmdb?.id) {
        console.log(`[Purstream Search] ✅ Match TMDB: ${byTmdb.id}`)
        return byTmdb.id
      }
    }

    const normTitle = title.toLowerCase().trim().replace(/[:]/g, '')

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
        console.log(`[Purstream Search] ✅ Match titre: ${item.id}`)
        return item.id
      }
    }

    console.log(`[Purstream Search] ⚠️ Fallback premier résultat`)
    return results[0]?.id || null

  } catch (err) {
    console.error('[Purstream Search Error]', err)
    return null
  }
}

// ─── Récupération URL Vidéo (Support nouvelle structure "rls") ─────────────────────
async function purstream_getMovieUrl(purstreamId: number): Promise<string | null> {
  try {
    console.log(`[Purstream Sheet Movie] ID: ${purstreamId}`)

    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    })

    if (!res.ok) return null

    const sheet = await res.json()

    let url: string | null = null

    // Nouvelle structure avec "rls"
    if (sheet.rls && Array.isArray(sheet.rls) && sheet.rls.length > 0) {
      console.log(`[Purstream] Structure "rls" détectée (${sheet.rls.length} liens)`)

      const best = sheet.rls.find((s: any) => 
        s.url?.includes('premium') || 
        s.url?.includes('cdn') || 
        s.name?.toLowerCase().includes('1080')
      )
      
      if (best?.url) url = best.url
      else url = sheet.rls[0].url
    }
    // Ancienne structure avec "sources"
    else if (sheet.sources && Array.isArray(sheet.sources) && sheet.sources.length > 0) {
      const premium = sheet.sources.find((s: any) => 
        s.url?.includes('premium') || s.url?.includes('cdn') || !s.url?.includes('free')
      )
      if (premium?.url) url = premium.url

      if (!url) {
        const m3u8 = sheet.sources.find((s: any) => s.url?.includes('.m3u8'))
        if (m3u8?.url) url = m3u8.url
      }
      if (!url) url = sheet.sources[0].url
    }

    if (!url) url = sheet.stream_url || sheet.video_url || sheet.url || null

    console.log(`[Purstream Sheet Movie] URL finale: ${url ? '✅' : '❌'} ${url ? url.substring(0, 80) + '...' : ''}`)
    return url
  } catch (err) {
    console.error('[purstream_getMovieUrl]', err)
    return null
  }
}

async function purstream_getEpisodeUrl(purstreamId: number, season: number, episode: number): Promise<string | null> {
  try {
    console.log(`[Purstream Sheet Episode] ID: ${purstreamId} S${season}E${episode}`)

    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    })

    if (!res.ok) return null

    const sheet = await res.json()

    let url: string | null = null

    // Nouvelle structure rls pour les épisodes
    if (sheet.rls && Array.isArray(sheet.rls) && sheet.rls.length > 0) {
      const best = sheet.rls.find((s: any) => 
        s.url?.includes('premium') || s.url?.includes('cdn') || s.name?.toLowerCase().includes('1080')
      )
      if (best?.url) url = best.url
      else url = sheet.rls[0].url
    }
    else if (sheet.episodes && Array.isArray(sheet.episodes)) {
      const ep = sheet.episodes.find((e: any) => e.season === season && e.episode === episode)
      if (ep) {
        if (ep.rls && Array.isArray(ep.rls) && ep.rls.length > 0) {
          const best = ep.rls.find((s: any) => s.url?.includes('premium') || s.url?.includes('cdn'))
          url = best?.url || ep.rls[0].url
        } else if (ep.sources && Array.isArray(ep.sources)) {
          const premium = ep.sources.find((s: any) => s.url?.includes('premium') || s.url?.includes('cdn'))
          url = premium?.url || ep.sources[0]?.url
        }
      }
    }
    // Fallback sources général
    else if (sheet.sources && Array.isArray(sheet.sources)) {
      const premium = sheet.sources.find((s: any) => 
        s.url?.includes('premium') || s.url?.includes('cdn')
      )
      url = premium?.url || sheet.sources[0]?.url
    }

    if (!url) url = sheet.stream_url || sheet.video_url || sheet.url

    console.log(`[Purstream Sheet Episode] URL finale: ${url ? '✅' : '❌'} ${url ? url.substring(0, 80) + '...' : ''}`)
    return url
  } catch (err) {
    console.error('[purstream_getEpisodeUrl]', err)
    return null
  }
}

// ─── Fonctions Publiques ──────────────────────────────────────────────────────
export async function getMovies(): Promise<Movie[]> { ... } // (le reste du fichier reste identique)

export async function getSeries(): Promise<Series[]> { ... }

export async function getMovieById(tmdbId: number): Promise<Movie | null> { ... }

export async function getSeriesById(tmdbId: number): Promise<Series | null> { ... }

export async function getEpisodes(seriesId: number, seasonNumber?: number): Promise<Episode[]> { ... }

export async function searchContent(query: string): Promise<{ movies: Movie[], series: Series[] }> { ... }

export async function getMovieVideoUrl(tmdbId: number, titleFallback?: string): Promise<string | null> { ... }

export async function getEpisodeVideoUrl(
  tmdbId: number,
  season: number,
  episode: number,
  titleFallback?: string
): Promise<string | null> { ... }
