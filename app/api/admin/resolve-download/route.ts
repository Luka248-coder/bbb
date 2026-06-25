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
    const res = await fetch(apiUrl, { cache: 'no-store' })
    const raw = await res.text()
    const trimmed = raw.trim()

    console.log('[resolve-download] raw:', JSON.stringify(trimmed.slice(0, 300)))

    // Cas texte brut : URL directe
    if (trimmed.startsWith('http')) {
      return NextResponse.json({ available: true, url: trimmed })
    }

    // Cas JSON : { url: "...", download_url: "...", link: "..." }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const data = JSON.parse(trimmed)
      const url = data?.url || data?.download_url || data?.link || data?.file || null
      if (url && String(url).startsWith('http')) {
        return NextResponse.json({ available: true, url: String(url) })
      }
      const isUnavailable = !url || String(url).toLowerCase().includes('indisponible')
      return NextResponse.json({ available: false, debug: data })
    }

    return NextResponse.json({ available: false, debug_raw: trimmed.slice(0, 200) })

  } catch (err: any) {
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
