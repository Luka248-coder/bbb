import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const API_KEY = 'ff_575a3531b4e190e5d8c89543e2a81a948f1b8265d8c1d53edfc631e3f8713d5f'
const BASE_URL = 'https://fastflux.xyz/api/v1/index.php'
const TOKEN_SUFFIX = '?ff=1782321640.cxUHiwCk-p2Zd6vzl2OTsS6O'
const PROXY_BASE = 'https://v0-proxy-ruddy.vercel.app/api/stream?url='

function buildDirectUrl(rawUrl: string): string {
  let url = rawUrl
  if (url && url.includes('.mp4') && !url.includes('?ff=')) {
    const mp4Index = url.indexOf('.mp4') + 4
    const before = url.slice(0, mp4Index)
    const after = url.slice(mp4Index)
    url = before + TOKEN_SUFFIX + (after ? '&' + after.replace(/^\?/, '') : '')
  }
  return `${PROXY_BASE}${encodeURIComponent(url)}&download=1`
}

function normalizePart(value: string | number | undefined, fallback: number): number {
  return parseInt(String(value ?? fallback).replace(/\D/g, '') || String(fallback), 10)
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { cache: 'no-store', headers: { 'Referer': 'https://fastflux.xyz/', 'Origin': 'https://fastflux.xyz', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36' } })
  const text = await res.text()
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new Error(`Non-JSON response (${res.status}): ${trimmed.slice(0, 150)}`)
  }
  return JSON.parse(trimmed)
}

export async function POST(request: NextRequest) {
  const { tmdbId, type, season, episode } = await request.json()

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'tmdbId et type requis' }, { status: 400 })
  }

  try {
    if (type === 'movie') {
      // Recherche directe par TMDB_ID
      const data = await fetchJson(
        `${BASE_URL}?route=movies/search&q=${tmdbId}&api_key=${API_KEY}`
      )
      const found = (data.data || data.results || [data].filter(Boolean))
        .find((m: any) => String(m.tmdb_id) === String(tmdbId))

      if (found) {
        const rawUrl = found.source?.url || found.url || found.download_url
        if (rawUrl) return NextResponse.json({ available: true, url: buildDirectUrl(rawUrl) })
      }

      // Fallback : chercher dans la liste paginée
      let page = 1
      while (true) {
        const listData = await fetchJson(`${BASE_URL}?route=movies&page=${page}&api_key=${API_KEY}`)
        const movie = (listData.data || []).find((m: any) => String(m.tmdb_id) === String(tmdbId))
        if (movie) {
          const rawUrl = movie.source?.url || movie.url
          if (rawUrl) return NextResponse.json({ available: true, url: buildDirectUrl(rawUrl) })
          return NextResponse.json({ available: false })
        }
        const totalPages = listData.pagination?.total_pages || 1
        if (page >= totalPages) break
        page++
      }

      return NextResponse.json({ available: false })

    } else {
      const sNum = normalizePart(season, 1)
      const eNum = normalizePart(episode, 1)

      // Recherche directe par TMDB_ID
      const data = await fetchJson(
        `${BASE_URL}?route=series/search&q=${tmdbId}&api_key=${API_KEY}`
      )
      const found = (data.data || data.results || [])
        .find((s: any) => String(s.tmdb_id) === String(tmdbId))

      const searchAndExtract = (serie: any) => {
        const ep = (serie.episodes || []).find((ep: any) => {
          const epSeason = parseInt(String(ep.season || '0').replace(/\D/g, ''), 10)
          return epSeason === sNum && ep.episode_number === eNum
        })
        return ep ? buildDirectUrl(ep.url) : null
      }

      if (found) {
        const url = searchAndExtract(found)
        if (url) return NextResponse.json({ available: true, url })
        return NextResponse.json({ available: false })
      }

      // Fallback : liste paginée
      let page = 1
      while (true) {
        const listData = await fetchJson(`${BASE_URL}?route=series&page=${page}&api_key=${API_KEY}`)
        const serie = (listData.data || []).find((s: any) => String(s.tmdb_id) === String(tmdbId))
        if (serie) {
          const url = searchAndExtract(serie)
          if (url) return NextResponse.json({ available: true, url })
          return NextResponse.json({ available: false })
        }
        const totalPages = listData.pagination?.total_pages || 1
        if (page >= totalPages) break
        page++
      }

      return NextResponse.json({ available: false })
    }

  } catch (err: any) {
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
