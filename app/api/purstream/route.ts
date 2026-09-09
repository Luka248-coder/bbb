import { NextRequest, NextResponse } from 'next/server'
import { getCinflixStreamUrl } from '@/lib/cinflix'

export const runtime = 'nodejs'
export const maxDuration = 60

const PURSTREAM_BASE = 'https://api.purstream.ad/api/v1'

const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://purstream.ad/',
  'Origin': 'https://purstream.ad',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
}

function normalizeTitle(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getResultYear(r: any): number | null {
  const raw = r?.year ?? r?.releaseDate ?? r?.release_date ?? r?.firstAirDate
    ?? r?.first_air_date ?? r?.date ?? r?.startYear ?? r?.aired ?? ''
  const m = String(raw).match(/\d{4}/)
  return m ? parseInt(m[0]) : null
}

// Choisit le bon résultat : tmdbId exact > titre+année > titre unique > premier
function pickMatch(results: any[], title: string, tmdbId: string | null, year: number | null): any {
  if (tmdbId) {
    const m = results.find((r: any) => String(r.tmdbId || r.tmdb_id) === tmdbId)
    if (m?.id) return m
  }
  const norm = normalizeTitle(title)
  const titleMatches = results.filter((r: any) => normalizeTitle(r.title || r.name || '') === norm)
  if (year && titleMatches.length > 0) {
    const withYear = titleMatches
      .map((r: any) => ({ r, y: getResultYear(r) }))
      .filter((x: any) => x.y != null) as { r: any; y: number }[]
    if (withYear.length > 0) {
      withYear.sort((a, b) => Math.abs(a.y - year) - Math.abs(b.y - year))
      return withYear[0].r
    }
  }
  if (titleMatches.length >= 1) return titleMatches[0]
  return null
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

// Sélectionne l'URL premium 1080p pour un épisode donné.
// Ne prend JAMAIS les URLs free. Retourne null si pas trouvé.
function pickBestUrl(
  urls: { url: string; name?: string }[],
  season: number,
  episode: number
): string | null {
  // Filtrer par S/E exact ET premium uniquement
  const matches = urls.filter(u => {
    if (!u.url.includes('premium')) return false
    const se = extractSeasonEpisode(u.url)
    return se && se.season === season && se.episode === episode
  })
  if (matches.length === 0) return null
  const mp4 = matches.find(u => u.url.includes('.mp4') && (u.name || '').includes('1080p'))
    || matches.find(u => u.url.includes('.mp4'))
  const hd = matches.find(u => (u.name || '').includes('1080p'))
  return (mp4 || hd || matches[0]).url
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title')
  const type = searchParams.get('type')
  const tmdbId = searchParams.get('tmdb_id')
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam) : null
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
      const fallback = tmdbId ? await getCinflixStreamUrl(type === 'movie' ? 'movie' : 'tv', Number(tmdbId), season, episode) : null
      return NextResponse.json({ videoUrl: fallback, error: fallback ? undefined : `Search failed: ${searchRes.status}` })
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
      const fallback = tmdbId ? await getCinflixStreamUrl(type === 'movie' ? 'movie' : 'tv', Number(tmdbId), season, episode) : null
      return NextResponse.json({ videoUrl: fallback, error: fallback ? undefined : 'Not found on Purstream' })
    }

    // Sélection stricte : tmdbId exact > titre+année > titre exact
    const match = pickMatch(results, title, tmdbId, year)
    if (!match?.id) {
      const fallback = tmdbId ? await getCinflixStreamUrl(type === 'movie' ? 'movie' : 'tv', Number(tmdbId), season, episode) : null
      return NextResponse.json({ videoUrl: fallback, error: fallback ? undefined : 'No exact match found' })
    }

    // ── 2. Sheet ──────────────────────────────────────────────────────────────
    const sheetRes = await fetch(
      `${PURSTREAM_BASE}/media/${match.id}/sheet`,
      { headers: HEADERS, cache: 'no-store' }
    )
    if (!sheetRes.ok) {
      const fallback = tmdbId ? await getCinflixStreamUrl(type === 'movie' ? 'movie' : 'tv', Number(tmdbId), season, episode) : null
      return NextResponse.json({ videoUrl: fallback, error: fallback ? undefined : `Sheet fetch failed: ${sheetRes.status}` })
    }

    const sheetRaw = await sheetRes.json()
    const sheet = sheetRaw?.data?.items ?? sheetRaw?.data ?? sheetRaw
    const allUrls: { url: string; name?: string }[] = sheet.urls || []

    let videoUrl: string | null = null

    if (type === 'movie') {
      // Film : premium uniquement, préférer 1080p
      const premUrls = allUrls.filter(u => u.url.includes('premium'))
      const pool = premUrls.length > 0 ? premUrls : allUrls
      const hd = pool.find(u => (u.name || '').includes('1080p'))
      videoUrl = (hd || pool[0])?.url || null

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
          const premUrls = epUrls.filter(u => u.url.includes('premium'))
          const pool = premUrls.length > 0 ? premUrls : epUrls
          const hd = pool.find(u => (u.name || '').includes('1080p'))
          videoUrl = (hd || pool[0])?.url || null
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
          const premUrls2 = epUrls.filter(u => u.url.includes('premium'))
          const pool2 = premUrls2.length > 0 ? premUrls2 : epUrls
          const hd2 = pool2.find(u => (u.name || '').includes('1080p'))
          videoUrl = (hd2 || pool2[0])?.url || null
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

    if (!videoUrl && tmdbId) {
      videoUrl = await getCinflixStreamUrl(type === 'movie' ? 'movie' : 'tv', Number(tmdbId), season, episode)
    }

    return NextResponse.json({ videoUrl, purstreamId: match.id })

  } catch (error) {
    console.error('[Purstream API] Error:', error)
    try {
      const fallback = tmdbId ? await getCinflixStreamUrl(type === 'movie' ? 'movie' : 'tv', Number(tmdbId), season, episode) : null
      if (fallback) return NextResponse.json({ videoUrl: fallback })
    } catch {}
    return NextResponse.json({ videoUrl: null, error: 'Internal error' }, { status: 500 })
  }
}
