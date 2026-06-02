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

interface PurstreamSheet {
  id?: number
  title?: string
  name?: string
  sources?: { url: string; quality?: string; label?: string }[]
  episodes?: {
    season: number
    episode: number
    sources?: { url: string; quality?: string }[]
    video_url?: string
  }[]
  video_url?: string
  url?: string
  [key: string]: unknown
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title')
  const type = searchParams.get('type')
  const tmdbId = searchParams.get('tmdb_id')
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')

  if (!title || !type) {
    return NextResponse.json({ videoUrl: null, error: 'Missing title or type' }, { status: 400 })
  }

  try {
    const searchUrl = `${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`
    const searchRes = await fetch(searchUrl, { headers: HEADERS, cache: 'no-store' })

    if (!searchRes.ok) {
      return NextResponse.json({ videoUrl: null, error: `Search failed: ${searchRes.status}` })
    }

    const searchJson = await searchRes.json()

    let results: PurstreamSearchResult[] = []
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

    let match: PurstreamSearchResult | undefined
    if (tmdbId) {
      match = results.find(r => String(r.tmdbId || r.tmdb_id) === tmdbId)
    }
    if (!match) {
      const normalizedTitle = title.toLowerCase().trim()
      match = results.find(r => (r.title || r.name || '').toLowerCase().trim() === normalizedTitle)
    }
    if (!match) match = results[0]
    if (!match?.id) {
      return NextResponse.json({ videoUrl: null, error: 'No suitable result found' })
    }

    const purstreamId = match.id
    const sheetRes = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: HEADERS,
      cache: 'no-store',
    })

    if (!sheetRes.ok) {
      return NextResponse.json({ videoUrl: null, error: `Sheet fetch failed: ${sheetRes.status}` })
    }

    const sheet: PurstreamSheet = await sheetRes.json()
    const items = (sheet as any)?.data?.items ?? (sheet as any)?.data ?? sheet
    let videoUrl: string | null = null

    if (type === 'movie') {
      if (items.urls?.length > 0) videoUrl = items.urls[0].url
      else videoUrl = items.video_url || items.url || null
    } else {
      const seasonNum = parseInt(season || '1')
      const episodeNum = parseInt(episode || '1')

      if (items.seasons?.length > 0) {
        const s = items.seasons.find((s: any) => Number(s.number ?? s.season ?? s.season_number) === seasonNum)
        if (s?.episodes?.length > 0) {
          const ep = s.episodes.find((e: any) => Number(e.number ?? e.episode ?? e.episode_number) === episodeNum)
          if (ep?.urls?.length > 0) videoUrl = ep.urls[0].url
          else if (ep?.url) videoUrl = ep.url
        }
      }

      if (!videoUrl && items.episodes?.length > 0) {
        const ep = items.episodes.find((e: any) =>
          Number(e.season ?? e.season_number) === seasonNum &&
          Number(e.episode ?? e.episode_number ?? e.number) === episodeNum
        )
        if (ep?.urls?.length > 0) videoUrl = ep.urls[0].url
        else if (ep?.url) videoUrl = ep.url
      }

      if (!videoUrl && items.urls?.length > 0) videoUrl = items.urls[0].url
      if (!videoUrl) videoUrl = items.video_url || items.url || null
    }

    return NextResponse.json({ videoUrl, purstreamId })
  } catch (error) {
    console.error('[Purstream API] Error:', error)
    return NextResponse.json({ videoUrl: null, error: 'Internal error querying Purstream' }, { status: 500 })
  }
}
