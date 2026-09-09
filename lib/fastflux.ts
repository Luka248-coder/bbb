// SERVEUR UNIQUEMENT — ne pas importer dans des Client Components
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import type { Movie, Series, Episode } from '@/lib/content-types'
import { getCinflixStreamUrl } from '@/lib/cinflix'

export type { Movie, Series, Episode } from '@/lib/content-types'
export { GENRES, getGenreNames, getPosterUrl, getBackdropUrl } from '@/lib/content-types'

const PURSTREAM_BASE = 'https://api.purstream.ad/api/v1'

const PURSTREAM_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://purstream.ad/',
  'Origin': 'https://purstream.ad',
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
function scoreMediaUrl(u: { url: string; name?: string }) {
  const name = (u.name || '').toLowerCase()
  const href = u.url.toLowerCase()
  let score = 0
  if (href.includes('premium')) score += 100
  if (href.includes('.mp4')) score += 50
  if (name.includes('1080')) score += 20
  else if (name.includes('720')) score += 10
  if (href.includes('.m3u8')) score -= 20
  return score
}

function bestUrl(urls: { url: string; name?: string }[]): string | null {
  if (!urls || urls.length === 0) return null
  const premUrls = urls.filter(u => u.url.includes('premium'))
  const pool = premUrls.length > 0 ? premUrls : urls
  return [...pool].sort((a, b) => scoreMediaUrl(b) - scoreMediaUrl(a))[0].url
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

// ─── Helpers de désambiguïsation ─────────────────────────────────────────────
function normalizeTitle(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retirer les accents
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getResultYear(r: any): number | null {
  const raw = r?.year ?? r?.releaseDate ?? r?.release_date ?? r?.firstAirDate
    ?? r?.first_air_date ?? r?.date ?? r?.startYear ?? r?.aired ?? ''
  const m = String(raw).match(/\d{4}/)
  return m ? parseInt(m[0]) : null
}

// ─── Recherche Purstream ─────────────────────────────────────────────────────
// year = année de sortie (issue de notre DB) — sert à distinguer p.ex.
// l'animé One Piece (1999) de la série live-action One Piece (2023).
async function purstream_searchId(
  title: string,
  type: 'movie' | 'series',
  tmdbId?: number,
  year?: number,
): Promise<number | null> {
  // Essai 1 : lookup direct par tmdbId (autoritaire)
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
      // On garde le bon type en priorité pour ne pas confondre film et série
      results = type === 'series' ? [...series, ...movies] : [...movies, ...series]
    } else if (Array.isArray(d)) {
      results = d
    }

    if (results.length === 0) return null

    // Priorité 1 : tmdbId exact (le plus fiable)
    if (tmdbId) {
      const match = results.find((r: any) => String(r.tmdbId || r.tmdb_id) === String(tmdbId))
      if (match?.id) { console.log(`[Purstream] ✅ tmdbId match → ${match.id}`); return match.id }
    }

    // Candidats au titre exact
    const norm = normalizeTitle(title)
    const titleMatches = results.filter((r: any) => normalizeTitle(r.title || r.name || '') === norm)

    // Priorité 2 : titre exact départagé par l'année
    if (year && titleMatches.length > 0) {
      const withYear = titleMatches
        .map((r: any) => ({ r, y: getResultYear(r) }))
        .filter((x: any) => x.y != null) as { r: any; y: number }[]
      if (withYear.length > 0) {
        withYear.sort((a, b) => Math.abs(a.y - year) - Math.abs(b.y - year))
        const best = withYear[0]
        console.log(`[Purstream] ✅ title+year match (${best.y} vs ${year}) → ${best.r.id}`)
        return best.r.id
      }
    }

    // Priorité 3 : un seul titre exact → sans ambiguïté
    if (titleMatches.length === 1) {
      console.log(`[Purstream] ✅ single title match → ${titleMatches[0].id}`)
      return titleMatches[0].id
    }

    // Priorité 4 : plusieurs titres exacts mais pas d'année pour départager
    if (titleMatches.length > 1) {
      console.warn(`[Purstream] ⚠️ ${titleMatches.length} correspondances "${title}" sans année — 1er titre pris`)
      return titleMatches[0].id
    }

    // Priorité 5 : aucun titre exact → premier résultat (compat)
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

      // Pas de fallback par index — si S/E exact pas trouvé → null
      console.warn(`[extractVideoUrl] ❌ S${seasonNum}E${episodeNum} introuvable — pas de fallback`)
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
    return await fetchAllRows<Movie>(() =>
      supabase.from('movies').select('*').order('popularity', { ascending: false }) as any
    )
  } catch { return [] }
}

export async function getSeries(): Promise<Series[]> {
  try {
    const supabase = await createClient()
    return await fetchAllRows<Series>(() =>
      supabase.from('series').select('*').order('popularity', { ascending: false }) as any
    )
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
    const safe = query.replace(/[%_,()]/g, ' ').trim()
    const search = `%${safe}%`
    const [{ data: movies }, { data: series }] = await Promise.all([
      supabase.from('movies').select('*').or(`title.ilike."${search}",original_title.ilike."${search}"`).limit(100),
      supabase.from('series').select('*').or(`name.ilike."${search}",original_name.ilike."${search}"`).limit(100),
    ])
    return { movies: movies || [], series: series || [] }
  } catch { return { movies: [], series: [] } }
}

export async function getMovieVideoUrl(tmdbId: number, titleOverride?: string): Promise<string | null> {
  const movie = await getMovieById(tmdbId)
  if (movie?.video_url) return movie.video_url

  const title = titleOverride || movie?.title || movie?.original_title || ''
  const year = movie?.release_date ? parseInt(movie.release_date.slice(0, 4)) : undefined
  const purstreamId = await purstream_searchId(title, 'movie', tmdbId, year)
  if (purstreamId) {
    const url = await extractVideoUrl(purstreamId, 'movie')
    if (url) return url
  }

  return getCinflixStreamUrl('movie', tmdbId)
}

export async function getEpisodeVideoUrl(
  tmdbId: number,
  season: number,
  episode: number,
  titleOverride?: string
): Promise<string | null> {
  const series = await getSeriesById(tmdbId)
  const title = titleOverride || series?.name || series?.original_name || ''
  const year = series?.first_air_date ? parseInt(series.first_air_date.slice(0, 4)) : undefined

  const purstreamId = await purstream_searchId(title, 'series', tmdbId, year)
  if (purstreamId) {
    const url = await extractVideoUrl(purstreamId, 'series', season, episode)
    if (url) return url
  }

  return getCinflixStreamUrl('tv', tmdbId, season, episode)
}
