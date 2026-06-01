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

    const searchData: PurstreamSearchResult[] = await searchRes.json()

    if (!Array.isArray(searchData) || searchData.length === 0) {
      return NextResponse.json({ videoUrl: null, error: 'Not found on Purstream' })
    }

    // 2. Trouver le bon résultat : priorité au tmdb_id, sinon correspondance titre + type
    let match: PurstreamSearchResult | undefined

    if (tmdbId) {
      match = searchData.find(r => String(r.tmdb_id) === tmdbId)
    }

    if (!match) {
      const normalizedTitle = title.toLowerCase().trim()
      const isMovie = type === 'movie'
      match = searchData.find(r => {
        const rTitle = (r.title || r.name || '').toLowerCase().trim()
        const rType = r.type?.toLowerCase()
        const typeMatch = isMovie
          ? rType === 'movie' || rType === 'film'
          : rType === 'series' || rType === 'tv' || rType === 'show'
        return rTitle === normalizedTitle && typeMatch
      })
    }

    // Fallback : premier résultat
    if (!match) {
      match = searchData[0]
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
    let videoUrl: string | null = null

    if (type === 'movie') {
      // Films : cherche une source MP4/M3U8 directe
      if (sheet.sources && Array.isArray(sheet.sources) && sheet.sources.length > 0) {
        // Préfère MP4, sinon M3U8
        const mp4 = sheet.sources.find(s => s.url?.includes('.mp4'))
        const m3u8 = sheet.sources.find(s => s.url?.includes('.m3u8'))
        videoUrl = mp4?.url || m3u8?.url || sheet.sources[0]?.url || null
      } else if (sheet.video_url) {
        videoUrl = sheet.video_url
      } else if (sheet.url) {
        videoUrl = sheet.url
      }
    } else {
      // Séries : cherche l'épisode spécifique
      const seasonNum = parseInt(season || '1')
      const episodeNum = parseInt(episode || '1')

      if (sheet.episodes && Array.isArray(sheet.episodes)) {
        const ep = sheet.episodes.find(
          e => e.season === seasonNum && e.episode === episodeNum
        )
        if (ep) {
          if (ep.sources && ep.sources.length > 0) {
            const mp4 = ep.sources.find(s => s.url?.includes('.mp4'))
            const m3u8 = ep.sources.find(s => s.url?.includes('.m3u8'))
            videoUrl = mp4?.url || m3u8?.url || ep.sources[0]?.url || null
          } else if (ep.video_url) {
            videoUrl = ep.video_url
          }
        }
      }

      // Fallback : source globale de la série (parfois les séries courtes ont une seule source)
      if (!videoUrl && sheet.sources && Array.isArray(sheet.sources)) {
        const mp4 = sheet.sources.find(s => s.url?.includes('.mp4'))
        const m3u8 = sheet.sources.find(s => s.url?.includes('.m3u8'))
        videoUrl = mp4?.url || m3u8?.url || sheet.sources[0]?.url || null
      }
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
