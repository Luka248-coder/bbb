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

// ─── Récupération URL Vidéo (Premium Prioritaire) ─────────────────────────────────
async function purstream_getMovieUrl(purstreamId: number): Promise<string | null> {
  try {
    console.log(`[Purstream Sheet Movie] ID: ${purstreamId}`)

    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    })

    if (!res.ok) return null

    const sheet = await res.json()

    let url: string | null = null

    if (sheet.sources && Array.isArray(sheet.sources) && sheet.sources.length > 0) {
      const premium = sheet.sources.find((s: any) => 
        s.url?.includes('premium') || s.url?.includes('cdn') || !s.url?.includes('free')
      )
      if (premium?.url) url = premium.url

      if (!url) {
        const mp4 = sheet.sources.find((s: any) => s.url?.includes('.mp4'))
        if (mp4?.url) url = mp4.url
      }
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

    if (sheet.episodes && Array.isArray(sheet.episodes)) {
      const ep = sheet.episodes.find((e: any) => e.season === season && e.episode === episode)
      if (ep) {
        if (ep.sources && Array.isArray(ep.sources) && ep.sources.length > 0) {
          const premium = ep.sources.find((s: any) => 
            s.url?.includes('premium') || s.url?.includes('cdn') || !s.url?.includes('free')
          )
          if (premium?.url) url = premium.url

          if (!url) {
            const mp4 = ep.sources.find((s: any) => s.url?.includes('.mp4'))
            if (mp4?.url) url = mp4.url
          }
          if (!url) {
            const m3u8 = ep.sources.find((s: any) => s.url?.includes('.m3u8'))
            if (m3u8?.url) url = m3u8.url
          }
          if (!url) url = ep.sources[0]?.url
        }
        if (!url) url = ep.video_url || ep.url
      }
    }

    if (!url && sheet.sources && Array.isArray(sheet.sources)) {
      const premium = sheet.sources.find((s: any) => 
        s.url?.includes('premium') || s.url?.includes('cdn') || !s.url?.includes('free')
      )
      if (premium?.url) url = premium.url

      if (!url) {
        const mp4 = sheet.sources.find((s: any) => s.url?.includes('.mp4'))
        if (mp4?.url) url = mp4.url
      }
      if (!url) {
        const m3u8 = sheet.sources.find((s: any) => s.url?.includes('.m3u8'))
        if (m3u8?.url) url = m3u8.url
      }
      if (!url) url = sheet.sources[0]?.url
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

export async function getMovieVideoUrl(tmdbId: number, titleFallback?: string): Promise<string | null> {
  const movie = await getMovieById(tmdbId)
  if (movie?.video_url) return movie.video_url

  const title = titleFallback || movie?.title || movie?.original_title
  if (!title) return null

  console.log(`[Purstream Movie] Tentative pour "${title}" (TMDB ${tmdbId})`)
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

      console.log(`[Purstream Episode] S${season}E${episode} "${title}"`)
      const purstreamId = await purstream_searchId(title, 'series', tmdbId)
      if (!purstreamId) return null

      return purstream_getEpisodeUrl(purstreamId, season, episode)
    }
  } catch {}

  if (titleFallback) {
    console.log(`[Purstream Episode Direct] "${titleFallback}"`)
    const purstreamId = await purstream_searchId(titleFallback, 'series', tmdbId)
    if (!purstreamId) return null
    return purstream_getEpisodeUrl(purstreamId, season, episode)
  }

  return null
}
