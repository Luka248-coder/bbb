import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const API_KEY = 'ff_575a3531b4e190e5d8c89543e2a81a948f1b8265d8c1d53edfc631e3f8713d5f'
const BASE_URL = 'https://fastflux.xyz/api/v1/index.php'
const TOKEN_SUFFIX = '?ff=1782321640.cxUHiwCk-p2Zd6vzl2OTsS6O'
const PROXY_BASE = 'https://v0-proxy-ruddy.vercel.app/api/stream?url='

const HEADERS = {
  'Referer': 'https://fastflux.xyz/',
  'Origin': 'https://fastflux.xyz',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
}

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

function normalizePart(value: string | number | undefined, fallback: number): string {
  const parsed = parseInt(String(value ?? fallback).replace(/\D/g, '') || String(fallback), 10)
  return String(parsed).padStart(2, '0')
}

async function fetchJson(url: string): Promise<{ data: any; debug?: string }> {
  const res = await fetch(url, { cache: 'no-store', headers: HEADERS })
  const text = await res.text()
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return { data: null, debug: `status:${res.status} raw:${trimmed.slice(0, 200)}` }
  }
  return { data: JSON.parse(trimmed) }
}

export async function POST(request: NextRequest) {
  const { tmdbId, type, season, episode } = await request.json()

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'tmdbId et type requis' }, { status: 400 })
  }

  try {
    if (type === 'movie') {
      let page = 1
      while (true) {
        const { data, debug } = await fetchJson(`${BASE_URL}?route=movies&page=${page}&api_key=${API_KEY}`)
        if (!data) return NextResponse.json({ available: false, debug })

        const found = (data.data || []).find((m: any) => String(m.tmdb_id) === String(tmdbId))
        if (found) {
          const url = buildDirectUrl(found.source?.url || found.url)
          return NextResponse.json({ available: true, url })
        }

        const totalPages = data.pagination?.total_pages || 1
        if (page >= totalPages) break
        page++
      }
      return NextResponse.json({ available: false })

    } else {
      const sNum = normalizePart(season, 1)
      const eNum = parseInt(normalizePart(episode, 1), 10)

      let page = 1
      while (true) {
        const { data, debug } = await fetchJson(`${BASE_URL}?route=series&page=${page}&api_key=${API_KEY}`)
        if (!data) return NextResponse.json({ available: false, debug })

        const found = (data.data || []).find((s: any) => String(s.tmdb_id) === String(tmdbId))
        if (found) {
          const ep = (found.episodes || []).find((ep: any) => {
            const epSeason = String(ep.season || '').replace('S', '').padStart(2, '0')
            return epSeason === sNum && ep.episode_number === eNum
          })
          if (ep) return NextResponse.json({ available: true, url: buildDirectUrl(ep.url) })
          return NextResponse.json({ available: false })
        }

        const totalPages = data.pagination?.total_pages || 1
        if (page >= totalPages) break
        page++
      }
      return NextResponse.json({ available: false })
    }

  } catch (err: any) {
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
