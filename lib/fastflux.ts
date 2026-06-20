// SERVEUR UNIQUEMENT — ne pas importer dans des Client Components
import { createClient } from '@/lib/supabase/server'
import type { Movie, Series, Episode } from '@/lib/content-types'

export type { Movie, Series, Episode } from '@/lib/content-types'
export { GENRES, getGenreNames, getPosterUrl, getBackdropUrl } from '@/lib/content-types'

const PURSTREAM_BASE = 'https://api.purstream.mx/api/v1'

const PURSTREAM_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://purstream.mx/',
  'Origin': 'https://purstream.mx',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'Connection': 'keep-alive',
}

// ─── Extraction S/E depuis une URL Purstream ────────────────────────────────
function extractSeasonEpisode(url: string): { season: number; episode: number } | null {
  const patterns = [
    /\/S(\d+)\/E(\d+)\//i,
    /\/S(\d+)\/E(\d+)[^/]/i,
    /[^a-z]s(\d+)[^a-z]?e(\d+)/i,
    /season[-_](\d+).*?episode[-_](\d+)/i,
    /\/(\d+)x(\d+)\//i,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return { season: parseInt(m[1]), episode: parseInt(m[2]) }
  }
  return null
}

// ─── Parse toutes les URLs d'un sheet en épisodes (comme le site de référence) ─
// Sélectionne la meilleure URL : premium > free, 1080p > 720p
function bestUrl(urls: { url: string; name?: string }[]): string | null {
  if (!urls || urls.length === 0) return null
  // Priorité 1 : premium 1080p
  const p1080 = urls.find(u => (u.name || '').toLowerCase().includes('premium') && (u.name || '').includes('1080p'))
  if (p1080) return p1080.url
  // Priorité 2 : premium (toute qualité)
  const prem = urls.find(u => (u.name || '').toLowerCase().includes('premium'))
  if (prem) return prem.url
  // Priorité 3 : 1080p free
  const f1080 = urls.find(u => (u.name || '').includes('1080p'))
  if (f1080) return f1080.url
  // Fallback : premier disponible
  return urls[0].url
}

function parseEpisodes(urls: { url: string; name?: string }[]): {
  season: number; episode: number; url: string; name: string
}[] {
  // Grouper toutes les URLs par saison/épisode
  const map = new Map<string, { url: string; name: string }[]>()

  urls.forEach((item) => {
    const se = extractSeasonEpisode(item.url)
    if (!se) return
    const key = `${se.season}-${se.episode}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push({ url: item.url, name: item.name || '' })
  })

  const episodes: { season: number; episode: number; url: string; name: string }[] = []
  map.forEach((candidates, key) => {
    const [s, e] = key.split('-').map(Number)
    const best = bestUrl(candidates)!
    const bestEntry = candidates.find(c => c.url === best)!
    episodes.push({ season: s, episode: e, url: best, name: bestEntry.name })
  })

  episodes.sort((a, b) => a.season - b.season || a.episode - b.episode)
  return episodes
}

// ─── Recherche Purstream ─────────────────────────────────────────────────────
async function purstream_searchId(title: string, type: 'movie' | 'series', tmdbId?: number): Promise<number | null> {
  // Essai 1 : lookup direct par tmdbId
  if (tmdbId) {
    const endpoints = [
      `${PURSTREAM_BASE}/media/tmdb/${tmdbId}`,
      `${PURSTREAM_BASE}/media/tmdb/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}`,
    ]
    for (const url of endpoints) {
      try {
        const r = await fetch(url, { headers: PURSTREAM_HEADERS, cache: 'no-store' })
        if (r.ok) {
          const d = await r.json()
          const id = d?.data?.items?.id || d?.data?.id || d?.id
          if (id) { console.log(`[Purstream] ✅ tmdbId lookup → id ${id}`); return id }
        }
      } catch {}
    }
  }

  // Essai 2 : recherche par titre
  const searchUrl = `${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`
  try {
    const r = await fetch(searchUrl, { headers: PURSTREAM_HEADERS, cache: 'no-store' })
    if (!r.ok) return null
    const d = await r.json()

    const si = d?.data?.items
    let results: any[] = []
    if (si) {
      const movies = si.movies?.items || si.movie?.items || []
      const series = si.series?.items || si.serie?.items || []
      results = type === 'series' ? [...series, ...movies] : [...movies, ...series]
    } else if (Array.isArray(d)) {
      results = d
    }

    if (results.length === 0) return null

    // Priorité : match par tmdbId puis par titre exact puis premier résultat
    if (tmdbId) {
      const match = results.find((r: any) => String(r.tmdbId || r.tmdb_id) === String(tmdbId))
      if (match?.id) { console.log(`[Purstream] ✅ tmdbId match in search → ${match.id}`); return match.id }
    }
    const norm = title.toLowerCase().trim()
    const titleMatch = results.find((r: any) => (r.title || r.name || '').toLowerCase().trim() === norm)
    if (titleMatch?.id) { console.log(`[Purstream] ✅ title match → ${titleMatch.id}`); return titleMatch.id }
    if (results[0]?.id) { console.log(`[Purstream] ✅ first result → ${results[0].id}`); return results[0].id }
  } catch (err) {
    console.error('[Purstream search error]', err)
  }

  console.error(`[Purstream] ❌ Not found: "${title}" tmdbId=${tmdbId}`)
  return null
}

// ─── Extraction URL depuis le sheet Purstream ────────────────────────────────
async function extractVideoUrl(
  purstreamId: number,
  type: 'movie' | 'series',
  season?: number,
  episode?: number
): Promise<string | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: PURSTREAM_HEADERS,
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error(`[extractVideoUrl] Sheet ${purstreamId} → ${res.status}`)
      return null
    }
    const json = await res.json()
    const items = json?.data?.items ?? json?.data ?? json

    if (type === 'movie') {
      if (items.urls?.length > 0) return bestUrl(items.urls)
      return items.video_url || items.url || null
    }

    // ── SÉRIES ──
    const seasonNum = season ?? 1
    const episodeNum = episode ?? 1

    console.log(`[extractVideoUrl] Looking for S${seasonNum}E${episodeNum} in purstreamId=${purstreamId}`)

    // Format 1 : items.seasons[].episodes[]
    if (items.seasons?.length > 0) {
      const s = items.seasons.find((s: any) =>
        Number(s.number ?? s.season ?? s.season_number) === seasonNum
      )
      if (s?.episodes?.length > 0) {
        const ep = s.episodes.find((e: any) =>
          Number(e.number ?? e.episode ?? e.episode_number) === episodeNum
        )
        if (ep?.urls?.length > 0) return bestUrl(ep.urls)
        if (ep?.url) return ep.url
      }
    }

    // Format 2 : items.episodes[] plat
    if (items.episodes?.length > 0) {
      const ep = items.episodes.find((e: any) => {
        const s = Number(e.season ?? e.season_number ?? e.seasonNumber)
        const n = Number(e.episode ?? e.episode_number ?? e.episodeNumber ?? e.number)
        return s === seasonNum && n === episodeNum
      })
      if (ep?.urls?.length > 0) return bestUrl(ep.urls)
      if (ep?.url) return ep.url
    }

    // Format 3 : items est un tableau directement
    if (Array.isArray(items)) {
      const ep = items.find((e: any) => {
        const s = Number(e.season ?? e.season_number)
        const n = Number(e.episode ?? e.episode_number ?? e.number)
        return s === seasonNum && n === episodeNum
      })
      if (ep?.urls?.length > 0) return bestUrl(ep.urls)
      if (ep?.url) return ep.url
    }

    // Format 4 (CLEF DU SITE DE RÉFÉRENCE) : liste plate d'URLs → regex S/E dans l'URL
    const allUrls: { url: string; name?: string }[] = items.urls || []
    if (allUrls.length > 0) {
      // Tenter le parseEpisodes complet pour trouver exactement S/E
      const parsed = parseEpisodes(allUrls)
      console.log(`[extractVideoUrl] parseEpisodes found ${parsed.length} episodes`)

      const found = parsed.find(e => e.season === seasonNum && e.episode === episodeNum)
      if (found) {
        console.log(`[extractVideoUrl] ✅ parseEpisodes S${seasonNum}E${episodeNum} → ${found.url.substring(0, 80)}`)
        return found.url
      }

      // Fallback : les URLs n'ont peut-être pas de pattern S/E mais sont ordonnées
      // On filtre par saison si possible, sinon on prend tout, et on indexe par épisode
      const withSE = allUrls.filter(u => extractSeasonEpisode(u.url) !== null)

      if (withSE.length > 0) {
        // Certaines URLs ont un pattern mais pas toutes → fallback index sur celles de la bonne saison
        const seasonUrls = allUrls.filter(u => {
          const se = extractSeasonEpisode(u.url)
          return !se || se.season === seasonNum
        })
        const idx = episodeNum - 1
        if (seasonUrls[idx]) {
          console.log(`[extractVideoUrl] ✅ index fallback S${seasonNum}E${episodeNum} [${idx}] → ${seasonUrls[idx].url.substring(0, 80)}`)
          return seasonUrls[idx].url
        }
      } else {
        // Aucune URL avec pattern S/E → probablement une seule saison, index direct
        const idx = episodeNum - 1
        if (allUrls[idx]) {
          console.log(`[extractVideoUrl] ✅ no-SE index S${seasonNum}E${episodeNum} [${idx}] → ${allUrls[idx].url.substring(0, 80)}`)
          return allUrls[idx].url
        }
      }

      // Log diagnostic
      const preview = allUrls.slice(0, 8).map((u, i) => {
        const se = extractSeasonEpisode(u.url)
        return `[${i}] ${se ? `S${se.season}E${se.episode}` : 'NO_SE'} → ${u.url.substring(0, 80)}`
      })
      console.warn(`[extractVideoUrl] ❌ S${seasonNum}E${episodeNum} introuvable. Aperçu URLs:\n${preview.join('\n')}`)
    }

    return null
  } catch (err) {
    console.error('[extractVideoUrl]', err)
    return null
  }
}

// ─── Fonctions Publiques ─────────────────────────────────────────────────────
export async function getMovies(): Promise<Movie[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('movies').select('*').order('popularity', { ascending: false })
    return data || []
  } catch { return [] }
}

export async function getSeries(): Promise<Series[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('series').select('*').order('popularity', { ascending: false })
    return data || []
  } catch { return [] }
}

export async function getMovieById(tmdbId: number): Promise<Movie | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('movies').select('*').eq('tmdb_id', tmdbId).single()
    return data || null
  } catch { return null }
}

export async function getSeriesById(tmdbId: number): Promise<Series | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('series').select('*').eq('tmdb_id', tmdbId).single()
    return data || null
  } catch { return null }
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
    const { data } = await query
    return data || []
  } catch { return [] }
}

export async function searchContent(query: string): Promise<{ movies: Movie[]; series: Series[] }> {
  try {
    const supabase = await createClient()
    const search = `%${query}%`
    const [{ data: movies }, { data: series }] = await Promise.all([
      supabase.from('movies').select('*').ilike('title', search),
      supabase.from('series').select('*').ilike('name', search),
    ])
    return { movies: movies || [], series: series || [] }
  } catch { return { movies: [], series: [] } }
}

export async function getMovieVideoUrl(tmdbId: number, titleOverride?: string): Promise<string | null> {
  const movie = await getMovieById(tmdbId)
  if (movie?.video_url) return movie.video_url

  const title = titleOverride || movie?.title || movie?.original_title || ''
  const purstreamId = await purstream_searchId(title, 'movie', tmdbId)
  if (!purstreamId) return null

  return extractVideoUrl(purstreamId, 'movie')
}

export async function getEpisodeVideoUrl(
  tmdbId: number,
  season: number,
  episode: number,
  titleOverride?: string
): Promise<string | null> {
  const series = await getSeriesById(tmdbId)
  const title = titleOverride || series?.name || series?.original_name || ''

  const purstreamId = await purstream_searchId(title, 'series', tmdbId)
  if (!purstreamId) return null

  return extractVideoUrl(purstreamId, 'series', season, episode)
}
