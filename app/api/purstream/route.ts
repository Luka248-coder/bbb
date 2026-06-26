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

// Extrait saison/épisode depuis une URL Purstream (tous formats connus)
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

// Parse et déduplique les épisodes depuis une liste d'URLs (préfère 1080p)
function parseEpisodes(urls: { url: string; name?: string }[]) {
  const episodes: { season: number; episode: number; url: string; name: string }[] = []
  urls.forEach((item) => {
    const se = extractSeasonEpisode(item.url)
    if (!se) return
    const { season, episode } = se
    const existing = episodes.find(e => e.season === season && e.episode === episode)
    const is1080 = (item.name || '').includes('1080p')
    if (!existing) {
      episodes.push({ season, episode, url: item.url, name: item.name || '' })
    } else if (is1080 && !existing.name.includes('1080p')) {
      existing.url = item.url
      existing.name = item.name || ''
    }
  })
  episodes.sort((a, b) => a.season - b.season || a.episode - b.episode)
  return episodes
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
    // No fuzzy fallback — require exact tmdbId or exact title match
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

    // ── 3a. Film ──────────────────────────────────────────────────────────────
    if (type === 'movie') {
      videoUrl = allUrls[0]?.url || sheet.video_url || sheet.url || null

    // ── 3b. Série ─────────────────────────────────────────────────────────────
    } else {
      // Format 1 : seasons[].episodes[]
      if (sheet.seasons?.length > 0) {
        const s = sheet.seasons.find((x: any) =>
          Number(x.number ?? x.season ?? x.season_number) === season
        )
        const ep = s?.episodes?.find((x: any) =>
          Number(x.number ?? x.episode ?? x.episode_number) === episode
        )
        if (ep) videoUrl = ep.urls?.[0]?.url || ep.url || ep.video_url || null
      }

      // Format 2 : episodes[] plat
      if (!videoUrl && sheet.episodes?.length > 0) {
        const ep = sheet.episodes.find((x: any) =>
          Number(x.season ?? x.season_number) === season &&
          Number(x.episode ?? x.episode_number ?? x.number) === episode
        )
        if (ep) videoUrl = ep.urls?.[0]?.url || ep.url || ep.video_url || null
      }

      // Format 3 (CLEF) : liste plate d'URLs → parseEpisodes avec regex S/E
      if (!videoUrl && allUrls.length > 0) {
        // Trier allUrls par S/E avant tout traitement
        const sortedUrls = [...allUrls].sort((a, b) => {
          const seA = extractSeasonEpisode(a.url)
          const seB = extractSeasonEpisode(b.url)
          if (!seA && !seB) return 0
          if (!seA) return 1
          if (!seB) return -1
          return seA.season - seB.season || seA.episode - seB.episode
        })

        const parsed = parseEpisodes(sortedUrls)
        const found = parsed.find(e => e.season === season && e.episode === episode)
        if (found) {
          videoUrl = found.url
          console.log(`[Purstream] ✅ parseEpisodes S${season}E${episode} → ${videoUrl.substring(0, 80)}`)
        }

        // No index fallback — only return URL if S/E pattern matches exactly
        if (!videoUrl) {
          console.warn(`[Purstream] ❌ S${season}E${episode} not found in URL patterns — refusing random fallback`)
        }
      }
    }

    return NextResponse.json({ videoUrl, purstreamId: match.id })

  } catch (error) {
    console.error('[Purstream API] Error:', error)
    return NextResponse.json({ videoUrl: null, error: 'Internal error' }, { status: 500 })
  }
}
