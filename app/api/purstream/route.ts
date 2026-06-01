import { NextRequest, NextResponse } from 'next/server'

const PURSTREAM_BASE = 'https://api.purstream.ac/api/v1'

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

/**
 * GET /api/purstream?title=euphoria&type=series&tmdb_id=85552
 * GET /api/purstream?title=inception&type=movie&tmdb_id=27205
 * GET /api/purstream?title=euphoria&type=series&tmdb_id=85552&season=1&episode=1
 *
 * Retourne { videoUrl: string | null, error?: string }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title')
  const type = searchParams.get('type') // 'movie' | 'series'
  const tmdbId = searchParams.get('tmdb_id')
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')

  if (!title || !type) {
    return NextResponse.json({ videoUrl: null, error: 'Missing title or type' }, { status: 400 })
  }

  try {
    // 1. Recherche du contenu par titre
    const searchUrl = `${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`
    const searchRes = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }, // cache 1h
    })

    if (!searchRes.ok) {
      return NextResponse.json({ videoUrl: null, error: `Search failed: ${searchRes.status}` })
    }

    const searchJson = await searchRes.json()

    // Structure réelle Purstream: { data: { items: { movies: { items: [] }, series: { items: [] } } } }
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

    // 2. Trouver le bon résultat : priorité au tmdb_id
    let match: PurstreamSearchResult | undefined

    if (tmdbId) {
      match = results.find(r => String(r.tmdbId || r.tmdb_id) === tmdbId)
    }

    if (!match) {
      const normalizedTitle = title.toLowerCase().trim()
      match = results.find(r => (r.title || r.name || '').toLowerCase().trim() === normalizedTitle)
    }

    // Fallback : premier résultat
    if (!match) {
      match = results[0]
    }

    if (!match?.id) {
      return NextResponse.json({ videoUrl: null, error: 'No suitable result found' })
    }

    const purstreamId = match.id

    // 3. Récupérer la fiche (sources vidéo)
    const sheetUrl = `${PURSTREAM_BASE}/media/${purstreamId}/sheet`
    const sheetRes = await fetch(sheetUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })

    if (!sheetRes.ok) {
      return NextResponse.json({ videoUrl: null, error: `Sheet fetch failed: ${sheetRes.status}` })
    }

    const sheet: PurstreamSheet = await sheetRes.json()

    // 4. Extraire l'URL vidéo
    // Structure réelle: { data: { items: { urls: [{url, name}], seasons: [...] } } }
    const items = sheet?.data?.items ?? sheet
    let videoUrl: string | null = null

    if (type === 'movie') {
      if (items.urls?.length > 0) {
        videoUrl = items.urls[0].url
      } else {
        videoUrl = items.video_url || items.url || null
      }
    } else {
      const seasonNum = parseInt(season || '1')
      const episodeNum = parseInt(episode || '1')

      // Structure: items.seasons[{number, episodes:[{number, urls:[]}]}]
      if (items.seasons?.length > 0) {
        const s = items.seasons.find((s: any) => s.number === seasonNum || s.season === seasonNum)
        if (s?.episodes?.length > 0) {
          const ep = s.episodes.find((e: any) => e.number === episodeNum || e.episode === episodeNum)
          if (ep?.urls?.length > 0) videoUrl = ep.urls[0].url
          else if (ep?.url) videoUrl = ep.url
        }
      }

      // Structure plate: items.episodes[{season, episode, urls:[]}]
      if (!videoUrl && items.episodes?.length > 0) {
        const ep = items.episodes.find(
          (e: any) => (e.season === seasonNum || e.seasonNumber === seasonNum) &&
                      (e.episode === episodeNum || e.number === episodeNum)
        )
        if (ep?.urls?.length > 0) videoUrl = ep.urls[0].url
        else if (ep?.url) videoUrl = ep.url
      }

      // Fallback: urls global
      if (!videoUrl && items.urls?.length > 0) videoUrl = items.urls[0].url
      if (!videoUrl) videoUrl = items.video_url || items.url || null
    }

    return NextResponse.json({ videoUrl, purstreamId })
  } catch (error) {
    console.error('[Purstream API] Error:', error)
    return NextResponse.json(
      { videoUrl: null, error: 'Internal error querying Purstream' },
      { status: 500 }
    )
  }
}
