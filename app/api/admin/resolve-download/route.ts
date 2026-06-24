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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    const html = await res.text()

    // L'URL est dans une balise <pre>...</pre> dans le HTML rendu
    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
    if (preMatch) {
      const preContent = preMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()
        // Retirer les guillemets éventuels autour
        .replace(/^["']|["']$/g, '')
        .trim()

      console.log('[resolve-download] pre content:', preContent.slice(0, 200))

      if (preContent.toLowerCase().includes('indisponible')) {
        return NextResponse.json({ available: false })
      }

      if (preContent.startsWith('http')) {
        return NextResponse.json({ available: true, url: preContent })
      }
    }

    console.log('[resolve-download] no <pre> found, html length:', html.length)
    return NextResponse.json({ available: false, debug: html.slice(0, 300) })
  } catch (err: any) {
    console.error('[resolve-download]', err)
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
