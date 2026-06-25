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

    // Extraire le contenu du <body> et retirer les guillemets
    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyContent = bodyMatch
      ? bodyMatch[1].replace(/<[^>]+>/g, '').replace(/['"]/g, '').trim()
      : raw.replace(/<[^>]+>/g, '').replace(/['"]/g, '').trim()

    console.log('[resolve-download] body:', JSON.stringify(bodyContent.slice(0, 200)))

    if (bodyContent.startsWith('http') && !bodyContent.toLowerCase().includes('indisponible')) {
      return NextResponse.json({ available: true, url: bodyContent })
    }

    return NextResponse.json({ available: false, debug: bodyContent.slice(0, 200) })

  } catch (err: any) {
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
