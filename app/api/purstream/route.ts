import { NextRequest, NextResponse } from 'next/server'

const PURSTREAM_BASE = 'https://api.purstream.ac/api/v1'

const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://purstream.ac/',
  'Origin': 'https://purstream.ac',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
}

interface PurstreamSearchResult {
  id: number
  title?: string
  name?: string
  type?: string
  tmdb_id?: number
  [key: string]: unknown
}

/**
 * Extrait saison/épisode depuis une URL Purstream.
 * Les URLs contiennent des segments comme /S01/E01/ ou /S1/E1/
 * Exemples :
 *   https://cdn.../S01/E05/index.m3u8
 *   https://cdn.../s01e05/video.m3u8
 *   https://cdn.../season-1/episode-5/...
 */
function extractSeasonEpisode(url: string): { season: number; episode: number } | null {
  // Format /S01/E05/ ou /S1/E5/
  let m = url.match(/\/S(\d+)\/E(\d+)\//i)
  if (m) return { season: parseInt(m[1]), episode: parseInt(m[2]) }

  // Format s01e05
  m = url.match(/s(\d+)e(\d+)/i)
  if (m) return { season: parseInt(m[1]), episode: parseInt(m[2]) }

  // Format season-1/episode-5 ou season_1/episode_5
  m = url.match(/season[-_](\d+).*?episode[-_](\d+)/i)
  if (m) return { season: parseInt(m[1]), episode: parseInt(m[2]) }

  // Format /1/5/ (saison/épisode dans le chemin)
  m = url.match(/\/(\d+)\/(\d+)\/[^/]*\.m3u8/i)
  if (m) return { season: parseInt(m[1]), episode: parseInt(m[2]) }

  return null
}

/**
 * Depuis une liste d'URLs plates, trouve celle correspondant à S/E voulu.
 */
function findEpisodeUrl(urls: { url: string }[], season: number, episode: number): string | null {
  for (const { url } of urls) {
    const se = extractSeasonEpisode(url)
    if (se && se.season === season && se.episode === episode) return url
  }
  return null
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title')
  const type = searchParams.get('type')
  const tmdbId = searchParams.get('tmdb_id')
  const season = parseInt(searchParams.get('season') || '1')
  const episode = parseInt(searchParams.get('episode') || '1')

  if (!title || !type) {
    return NextResponse.json({ videoUrl: null, error: 'Missing title or type' }, { status: 400 })
  }

  try {
    // ── 1. Recherche ──────────────────────────────────────────────────────────
    const searchRes = await fetch(
      `${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`,
      { headers: HEADERS, cache: 'no-store' }
    )
    if (!searchRes.ok) {
      return NextResponse.json({ videoUrl: null, error: `Search failed: ${searchRes.status}` })
    }

    const searchJson = await searchRes.json()

    // L'API peut retourner un tableau direct ou un objet { data: { items: { movies, series } } }
    let results: PurstreamSearchResult[] = []
    const si = searchJson?.data?.items
    if (si) {
      const movieItems = si.movies?.items || si.movie?.items || []
      const seriesItems = si.series?.items || si.serie?.items || []
      results = type === 'movie'
        ? [...movieItems, ...seriesItems]
        : [...seriesItems, ...movieItems]
    } else if (Array.isArray(searchJson)) {
      results = searchJson
    }

    if (results.length === 0) {
      return NextResponse.json({ videoUrl: null, error: 'Not found on Purstream' })
    }

    // Trouver le meilleur match
    let match: PurstreamSearchResult | undefined
    if (tmdbId) {
      match = results.find(r => String(r.tmdbId || r.tmdb_id) === tmdbId)
    }
    if (!match) {
      const norm = title.toLowerCase().trim()
      match = results.find(r => (r.title || r.name || '').toLowerCase().trim() === norm)
    }
    if (!match) match = results[0]
    if (!match?.id) {
      return NextResponse.json({ videoUrl: null, error: 'No suitable result found' })
    }

    // ── 2. Sheet ──────────────────────────────────────────────────────────────
    const sheetRes = await fetch(
      `${PURSTREAM_BASE}/media/${match.id}/sheet`,
      { headers: HEADERS, cache: 'no-store' }
    )
    if (!sheetRes.ok) {
      return NextResponse.json({ videoUrl: null, error: `Sheet fetch failed: ${sheetRes.status}` })
    }

    const sheetRaw = await sheetRes.json()
    // Normaliser : l'API wraps parfois dans data.items ou data
    const sheet = sheetRaw?.data?.items ?? sheetRaw?.data ?? sheetRaw

    let videoUrl: string | null = null

    // ── 3a. FILM ──────────────────────────────────────────────────────────────
    if (type === 'movie') {
      const urls: { url: string }[] = sheet.urls || []
      videoUrl = urls[0]?.url || sheet.video_url || sheet.url || null
    }

    // ── 3b. SÉRIE ─────────────────────────────────────────────────────────────
    else {
      const urls: { url: string }[] = sheet.urls || []

      // Priorité 1 : structure seasons[].episodes[]
      if (sheet.seasons?.length > 0) {
        const s = sheet.seasons.find((x: any) =>
          Number(x.number ?? x.season ?? x.season_number) === season
        )
        if (s?.episodes?.length > 0) {
          const ep = s.episodes.find((x: any) =>
            Number(x.number ?? x.episode ?? x.episode_number) === episode
          )
          if (ep) {
            const epUrls: { url: string }[] = ep.urls || []
            videoUrl = epUrls[0]?.url || ep.url || ep.video_url || null
          }
        }
      }

      // Priorité 2 : structure episodes[] plate (avec champs season/episode)
      if (!videoUrl && sheet.episodes?.length > 0) {
        const ep = sheet.episodes.find((x: any) =>
          Number(x.season ?? x.season_number) === season &&
          Number(x.episode ?? x.episode_number ?? x.number) === episode
        )
        if (ep) {
          const epUrls: { url: string }[] = ep.urls || []
          videoUrl = epUrls[0]?.url || ep.url || ep.video_url || null
        }
      }

      // Priorité 3 : liste plate d'URLs — extraire S/E depuis l'URL elle-même
      // C'est le cas principal décrit dans le flow Pur.jsx
      if (!videoUrl && urls.length > 0) {
        videoUrl = findEpisodeUrl(urls, season, episode)

        // Debug : si on ne trouve pas l'épisode, logger les SEs disponibles
        if (!videoUrl) {
          const available = urls
            .map(u => extractSeasonEpisode(u.url))
            .filter(Boolean)
            .map(se => `S${se!.season}E${se!.episode}`)
          console.warn(
            `[Purstream] S${season}E${episode} non trouvé dans les URLs. Disponibles: ${available.join(', ')}`
          )
          // Dernier recours : première URL (comportement original, peut donner le mauvais épisode)
          // On ne le fait PAS pour éviter de servir le mauvais contenu
        }
      }
    }

    return NextResponse.json({
      videoUrl,
      purstreamId: match.id,
      // Infos debug utiles
      debug: process.env.NODE_ENV === 'development' ? {
        sheetKeys: Object.keys(sheet),
        hasSeasons: !!sheet.seasons?.length,
        hasEpisodes: !!sheet.episodes?.length,
        urlsCount: (sheet.urls || []).length,
      } : undefined,
    })

  } catch (error) {
    console.error('[Purstream API] Error:', error)
    return NextResponse.json({ videoUrl: null, error: 'Internal error querying Purstream' }, { status: 500 })
  }
}
