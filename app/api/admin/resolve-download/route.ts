import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const DOWNLOAD_API = 'https://amorphous-stream-flux-hub.base44.app/api'

function normalizePart(value: string | number | undefined, fallback: number): string {
  const parsed = parseInt(String(value ?? fallback).replace(/\D/g, '') || String(fallback), 10)
  return String(parsed).padStart(2, '0')
}

function extractDownloadUrl(html: string): string | null {
  // L'URL est rendue côté client (React), donc on cherche dans les scripts
  // Pattern : chercher toutes les URLs qui ressemblent à un lien download
  const urls = html.match(/https?:\\?\/\\?\/[^\s"'<>\n\r\\]+/gi) ?? []

  const clean = (u: string) => u.replace(/\\+\//g, '/').replace(/\\"/g, '')

  for (const raw of urls) {
    const u = clean(raw)
    if (u.includes('download=1')) return u
    if (u.toLowerCase().includes('.mp4') && !u.includes('base44.com')) return u
    if (u.includes('/api/stream')) return u
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
    // Attendre 1.5s que le JS côté serveur base44 génère l'URL
    await new Promise(r => setTimeout(r, 1500))

    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; bot)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    const html = await res.text()

    console.log('[resolve-download] html length:', html.length, '| sample:', html.slice(0, 200))

    if (html.toLowerCase().includes('indisponible')) {
      return NextResponse.json({ available: false })
    }

    const url = extractDownloadUrl(html)
    console.log('[resolve-download] extracted:', url)

    if (!url) {
      // L'app est un SPA React — le contenu est rendu côté client,
      // fetch() côté serveur ne peut pas exécuter le JS.
      // On retourne l'apiUrl pour que le client la charge lui-même.
      return NextResponse.json({ available: 'client', apiUrl })
    }

    return NextResponse.json({ available: true, url })
  } catch (err: any) {
    console.error('[resolve-download]', err)
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
