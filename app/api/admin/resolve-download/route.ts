import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const DOWNLOAD_API = 'https://amorphous-stream-flux-hub.base44.app/api'

function normalizePart(value: string | number | undefined, fallback: number): string {
  const parsed = parseInt(String(value ?? fallback).replace(/\D/g, '') || String(fallback), 10)
  return String(parsed).padStart(2, '0')
}

export async function POST(request: NextRequest) {
  const { tmdbId, type, season, episode } = await request.json()

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'tmdbId et type requis' }, { status: 400 })
  }

  let apiUrl: string
  if (type === 'movie') {
    apiUrl = `${DOWNLOAD_API}/movie/${tmdbId}/`
  } else {
    const s = normalizePart(season, 1)
    const e = normalizePart(episode, 1)
    apiUrl = `${DOWNLOAD_API}/serie/${tmdbId}/S${s}/E${e}/`
  }

  try {
    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept': 'text/plain, */*',
      },
    })

    const text = (await res.text()).trim()

    // Retourner le debug TOUJOURS pour diagnostiquer
    return NextResponse.json({
      available: text.startsWith('http'),
      url: text.startsWith('http') ? text : undefined,
      debug_status: res.status,
      debug_raw: text.slice(0, 500),
      debug_url: apiUrl,
    })

  } catch (err: any) {
    return NextResponse.json({
      available: false,
      error: err.message,
      debug_url: apiUrl,
    }, { status: 502 })
  }
}
