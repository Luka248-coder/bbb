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

  // Forwarder les cookies du navigateur de l'utilisateur vers base44
  const forwardCookies = request.headers.get('cookie') ?? ''

  try {
    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Referer': 'https://amorphous-stream-flux-hub.base44.app/',
        'Cookie': forwardCookies,
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
      },
    })

    const raw = await res.text()
    const trimmed = raw.trim()

    // Cas texte brut direct
    if (trimmed.startsWith('http')) {
      return NextResponse.json({ available: true, url: trimmed.replace(/['"]/g, '') })
    }

    // Cas HTML minimal : <body>"URL"</body>
    const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      const content = bodyMatch[1].replace(/<[^>]+>/g, '').replace(/['"]/g, '').trim()
      if (content.startsWith('http')) {
        return NextResponse.json({ available: true, url: content })
      }
    }

    return NextResponse.json({ available: false, debug: trimmed.slice(0, 150) })

  } catch (err: any) {
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
