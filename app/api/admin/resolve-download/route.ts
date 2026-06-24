import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const DOWNLOAD_API = 'https://amorphous-stream-flux-hub.base44.app/api'

function normalizePart(value: string | number | undefined, fallback: number): string {
  const parsed = parseInt(String(value ?? fallback).replace(/\D/g, '') || String(fallback), 10)
  return String(parsed).padStart(2, '0')
}

function extractUrl(raw: string): string | null {
  // Nettoyer : retirer guillemets, espaces, retours à la ligne
  const cleaned = raw.replace(/['"]/g, '').trim()

  // Cas 1 : le texte entier est une URL
  if (/^https?:\/\//i.test(cleaned)) return cleaned

  // Cas 2 : l'URL est quelque part dans le texte
  const match = cleaned.match(/https?:\/\/[^\s"'<>\n\r]+/i)
  return match ? match[0] : null
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

    console.log('[resolve-download] status:', res.status, '| raw:', JSON.stringify(raw.slice(0, 300)))

    if (raw.toLowerCase().includes('indisponible')) {
      return NextResponse.json({ available: false })
    }

    const url = extractUrl(raw)
    console.log('[resolve-download] extracted url:', url)

    if (!url) {
      return NextResponse.json({ available: false, debug: raw.slice(0, 200) })
    }

    return NextResponse.json({ available: true, url })
  } catch (err: any) {
    console.error('[resolve-download]', err)
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
