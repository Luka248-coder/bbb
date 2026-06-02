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
 * Couvre tous les formats connus.
 */
function extractSeasonEpisode(url: string): { season: number; episode: number } | null {
  const patterns = [
    /\/S(\d+)\/E(\d+)\//i,           // /S01/E05/
    /\/S(\d+)\/E(\d+)[^/]/i,         // /S01/E05.m3u8
    /[^a-z]s(\d+)[^a-z]?e(\d+)/i,   // s01e05, s1e5
    /season[-_](\d+).*?episode[-_](\d+)/i,
    /saison[-_](\d+).*?episode[-_](\d+)/i,
    /\/(\d+)x(\d+)\//i,              // /1x05/
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return { season: parseInt(m[1]), episode: parseInt(m[2]) }
  }
  return null
}

function findEpisodeInUrls(urls: { url: string }[], season: number, episode: number): string | null {
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
    const sheet = sheetRaw?.data?.items ?? sheetRaw?.data ?? sheetRaw

    // Logger toutes les URLs pour debug (visible dans les logs Vercel)
    const allUrls: { url: string }[] = sheet.urls || []
    if (allUrls.length > 0) {
      console.log(`[Purstream] "${title}" sheet urls (${allUrls.length} total):`,
        allUrls.slice(0, 5).map((u, i) => `[${i}] ${u.url.substring(0, 100)}`)
      )
    }

    let videoUrl: string | null = null

    // ── 3a. FILM ──────────────────────────────────────────────────────────────
    if (type === 'movie') {
      videoUrl = allUrls[0]?.url || sheet.video_url || sheet.url || null
    }

    // ── 3b. SÉRIE ─────────────────────────────────────────────────────────────
    else {
      // Priorité 1 : structure seasons[].episodes[]
      if (sheet.seasons?.length > 0) {
        const s = sheet.seasons.find((x: any) =>
          Number(x.number ?? x.season ?? x.season_number) === season
        )
        const ep = s?.episodes?.find((x: any) =>
          Number(x.number ?? x.episode ?? x.episode_number) === episode
        )
        if (ep) {
          const epUrls: { url: string }[] = ep.urls || []
          videoUrl = epUrls[0]?.url || ep.url || ep.video_url || null
        }
      }

      // Priorité 2 : episodes[] plate avec champs season/episode
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

      // Priorité 3 : liste plate d'URLs → regex S/E dans l'URL
      if (!videoUrl && allUrls.length > 0) {
        videoUrl = findEpisodeInUrls(allUrls, season, episode)

        if (videoUrl) {
          console.log(`[Purstream] ✅ Found S${season}E${episode} via URL regex: ${videoUrl.substring(0, 80)}`)
        } else {
          // Priorité 4 : les URLs sont ordonnées par épisode → position = index
          // On cherche d'abord les URLs de la bonne saison, puis on prend le bon index
          const seasonUrls = allUrls.filter(u => {
            const se = extractSeasonEpisode(u.url)
            // Si aucune regex ne matche → on suppose une seule saison, garder toutes
            if (!se) return true
            return se.season === season
          })

          // Si les URLs ont un pattern saison mais pas épisode, ou pas de pattern du tout :
          // supposer qu'elles sont ordonnées et prendre episode-1 comme index
          const targetIndex = episode - 1
          if (seasonUrls[targetIndex]) {
            videoUrl = seasonUrls[targetIndex].url
            console.log(`[Purstream] ✅ Found S${season}E${episode} via index [${targetIndex}]: ${videoUrl.substring(0, 80)}`)
          }

          if (!videoUrl) {
            // Log pour diagnostiquer dans Vercel
            const parsed = allUrls.map((u, i) => {
              const se = extractSeasonEpisode(u.url)
              return `[${i}] ${se ? `S${se.season}E${se.episode}` : 'NO_SE'} → ${u.url.substring(0, 80)}`
            })
            console.warn(`[Purstream] ❌ S${season}E${episode} introuvable. URLs disponibles:\n${parsed.join('\n')}`)
          }
        }
      }
    }

    return NextResponse.json({ videoUrl, purstreamId: match.id })

  } catch (error) {
    console.error('[Purstream API] Error:', error)
    return NextResponse.json({ videoUrl: null, error: 'Internal error querying Purstream' }, { status: 500 })
  }
}
