import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const DOWNLOAD_API = 'https://amorphous-stream-flux-hub.base44.app/api'

function normalizePart(value: string | number | undefined, fallback: number): string {
  const parsed = parseInt(String(value ?? fallback).replace(/\D/g, '') || String(fallback), 10)
  return String(parsed).padStart(2, '0')
}

function extractDownloadUrl(raw: string): string | null {
  // Extraire toutes les URLs présentes dans la réponse
  const urls = raw.match(/https?:\/\/[^\s"'<>\n\r]+/gi) ?? []

  // Priorité 1 : URL avec download=1 (pattern exact de l'API)
  const downloadUrl = urls.find(u => u.includes('download=1'))
  if (downloadUrl) return downloadUrl

  // Priorité 2 : URL contenant un .mp4
  const mp4Url = urls.find(u => u.toLowerCase().includes('.mp4'))
  if (mp4Url) return mp4Url

  // Priorité 3 : URL de stream proxy
  const streamUrl = urls.find(u => u.includes('/api/stream'))
  if (streamUrl) return streamUrl

  return null
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

    console.log('[resolve-download] raw:', JSON.stringify(raw.slice(0, 400)))

    if (raw.toLowerCase().includes('indisponible')) {
      return NextResponse.json({ available: false })
    }

    const url = extractDownloadUrl(raw)
    console.log('[resolve-download] extracted:', url)

    if (!url) {
      return NextResponse.json({ available: false, debug: raw.slice(0, 300) })
    }

    return NextResponse.json({ available: true, url })
  } catch (err: any) {
    console.error('[resolve-download]', err)
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
