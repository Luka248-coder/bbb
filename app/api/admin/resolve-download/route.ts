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
  const encoded = encodeURIComponent(url)
  return `${PROXY_BASE}${encoded}&download=1`
}

function normalizePart(value: string | number | undefined, fallback: number): string {
  const parsed = parseInt(String(value ?? fallback).replace(/\D/g, '') || String(fallback), 10)
  return String(parsed).padStart(2, '0')
}

export async function POST(request: NextRequest) {
  const { tmdbId, type, season, episode } = await request.json()

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'tmdbId et type requis' }, { status: 400 })
  }

  try {
    if (type === 'movie') {
      // Parcourir les pages jusqu'à trouver le film par tmdb_id
      let page = 1
      while (true) {
        const res = await fetch(`${BASE_URL}?route=movies&page=${page}&api_key=${API_KEY}`, { cache: 'no-store' })
        const data = await res.json()
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
      // Série
      const sNum = normalizePart(season, 1)
      const eNum = parseInt(normalizePart(episode, 1), 10)

      let page = 1
      while (true) {
        const res = await fetch(`${BASE_URL}?route=series&page=${page}&api_key=${API_KEY}`, { cache: 'no-store' })
        const data = await res.json()
        const found = (data.data || []).find((s: any) => String(s.tmdb_id) === String(tmdbId))

        if (found) {
          const ep = (found.episodes || []).find((ep: any) => {
            const epSeason = String(ep.season || '').replace('S', '').padStart(2, '0')
            const epNum = ep.episode_number
            return epSeason === sNum && epNum === eNum
          })

          if (ep) {
            const url = buildDirectUrl(ep.url)
            return NextResponse.json({ available: true, url })
          }

          return NextResponse.json({ available: false })
        }

        const totalPages = data.pagination?.total_pages || 1
        if (page >= totalPages) break
        page++
      }

      return NextResponse.json({ available: false })
    }

  } catch (err: any) {
    console.error('[resolve-download]', err)
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
