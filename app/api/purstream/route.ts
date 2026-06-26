import { NextRequest, NextResponse } from 'next/server'

const PURSTREAM_BASE = 'https://api.purstream.mx/api/v1'

const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://purstream.mx/',
  'Origin': 'https://purstream.mx',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
}

// Extrait saison/épisode depuis une URL — pattern strict S{n}/E{n}
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

// Sélectionne la meilleure URL pour un épisode donné parmi une liste :
// - préfère "premium" sur "free"
// - préfère 1080p
// - retourne null si aucune URL ne correspond EXACTEMENT au bon S/E
function pickBestUrl(
  urls: { url: string; name?: string }[],
  season: number,
  episode: number
): string | null {
  const matches = urls.filter(u => {
    const se = extractSeasonEpisode(u.url)
    return se && se.season === season && se.episode === episode
  })

  if (matches.length === 0) return null

  // Préférer premium > free, puis 1080p
  const premium = matches.filter(u => u.url.includes('premium') || !u.url.includes('free'))
  const pool = premium.length > 0 ? premium : matches
  const hd = pool.find(u => (u.name || '').includes('1080p'))
  return (hd || pool[0]).url
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
    let results: any[] = []
    const si = searchJson?.data?.items
    if (si) {
      const movieItems = si.movies?.items || si.movie?.items || []
      const seriesItems = si.series?.items || si.serie?.items || []
      results = type === 'movie' ? [...movieItems, ...seriesItems] : [...seriesItems, ...movieItems]
    } else if (Array.isArray(searchJson)) {
      results = searchJson
    }

    if (results.length === 0) {
      return NextResponse.json({ videoUrl: null, error: 'Not found on Purstream' })
    }

    let match: any
    if (tmdbId) {
      match = results.find((r: any) => String(r.tmdbId || r.tmdb_id) === tmdbId)
    }
    if (!match) {
      const norm = title.toLowerCase().trim()
      match = results.find((r: any) => (r.title || r.name || '').toLowerCase().trim() === norm)
    }
    // Pas de fallback flou — titre ou tmdbId exact requis
    if (!match?.id) {
      return NextResponse.json({ videoUrl: null, error: 'No exact match found' })
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
    const allUrls: { url: string; name?: string }[] = sheet.urls || []

    let videoUrl: string | null = null

    if (type === 'movie') {
      // Film : prendre premium si dispo, sinon premier
      const premium = allUrls.find(u => u.url.includes('premium') || !u.url.includes('free'))
      videoUrl = (premium || allUrls[0])?.url || null

    } else {
      // ── Format 1 : seasons[].episodes[] ──
      if (!videoUrl && sheet.seasons?.length > 0) {
        const s = sheet.seasons.find((x: any) =>
          Number(x.number ?? x.season ?? x.season_number) === season
        )
        const ep = s?.episodes?.find((x: any) =>
          Number(x.number ?? x.episode ?? x.episode_number) === episode
        )
        if (ep) {
          const epUrls: { url: string; name?: string }[] = ep.urls || (ep.url ? [{ url: ep.url }] : [])
          // Préférer premium
          const prem = epUrls.find(u => u.url.includes('premium') || !u.url.includes('free'))
          videoUrl = (prem || epUrls[0])?.url || null
        }
      }

      // ── Format 2 : episodes[] plat ──
      if (!videoUrl && sheet.episodes?.length > 0) {
        const ep = sheet.episodes.find((x: any) =>
          Number(x.season ?? x.season_number) === season &&
          Number(x.episode ?? x.episode_number ?? x.number) === episode
        )
        if (ep) {
          const epUrls: { url: string; name?: string }[] = ep.urls || (ep.url ? [{ url: ep.url }] : [])
          const prem = epUrls.find(u => u.url.includes('premium') || !u.url.includes('free'))
          videoUrl = (prem || epUrls[0])?.url || null
        }
      }

      // ── Format 3 : liste plate d'URLs avec pattern S/E dans l'URL ──
      if (!videoUrl && allUrls.length > 0) {
        videoUrl = pickBestUrl(allUrls, season, episode)
        if (videoUrl) {
          console.log(`[Purstream] ✅ Format3 S${season}E${episode} → ${videoUrl.substring(0, 80)}`)
        } else {
          console.warn(`[Purstream] ❌ S${season}E${episode} introuvable — pas de fallback`)
        }
      }
    }

    return NextResponse.json({ videoUrl, purstreamId: match.id })

  } catch (error) {
    console.error('[Purstream API] Error:', error)
    return NextResponse.json({ videoUrl: null, error: 'Internal error' }, { status: 500 })
  }
}
