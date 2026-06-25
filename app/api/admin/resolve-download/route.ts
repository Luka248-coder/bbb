import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const DOWNLOAD_API = 'https://amorphous-stream-flux-hub.base44.app/api'

function normalizePart(value: string | number | undefined, fallback: number): string {
  const parsed = parseInt(String(value ?? fallback).replace(/\D/g, '') || String(fallback), 10)
  return String(parsed).padStart(2, '0')
}

function extractFromHtml(html: string): string | null {
  // Chercher document.write("URL") ou document.write('URL')
  const writeMatch = html.match(/document\.write\s*\(\s*["']([^"']+)["']\s*\)/)
  if (writeMatch) {
    const val = writeMatch[1].trim()
    if (val.startsWith('http')) return val
  }

  // Chercher document.open() suivi du contenu — parfois le texte est entre les balises
  // Chercher toute URL http dans les scripts inline
  const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of scriptMatches) {
    const scriptContent = m[1]
    const urlMatch = scriptContent.match(/["'`](https?:\/\/[^"'`\s]+)["'`]/)
    if (urlMatch) {
      const url = urlMatch[1]
      if (url.includes('download') || url.includes('.mp4') || url.includes('stream')) {
        return url
      }
    }
  }

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
    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,*/*',
      },
    })

    const html = await res.text()

    // Cas 1 : texte brut direct (si base44 améliore un jour)
    const trimmed = html.trim()
    if (trimmed.startsWith('http')) {
      return NextResponse.json({ available: true, url: trimmed })
    }

    // Cas 2 : document.write dans le JS
    const url = extractFromHtml(html)
    if (url) {
      return NextResponse.json({ available: true, url })
    }

    // Debug pour voir les scripts
    const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
      .map(m => m[1].trim())
      .filter(s => s.length > 0 && !s.includes('trackPageView'))
      .join('\n---\n')
      .slice(0, 500)

    return NextResponse.json({ available: false, debug_scripts: scripts })

  } catch (err: any) {
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
