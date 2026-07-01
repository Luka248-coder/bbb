import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const TOPSTREAM_HOST = 'free.topstream.cloud'
const SPOOF_REFERER = 'https://purstream.mx/'
const SPOOF_ORIGIN = 'https://purstream.mx'

const SPOOF_HEADERS = {
  'Referer': SPOOF_REFERER,
  'Origin': SPOOF_ORIGIN,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'cross-site',
}

/**
 * Vérifie que l'URL cible est bien sur free.topstream.cloud (sécurité SSRF).
 */
function isSafeTarget(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === TOPSTREAM_HOST || u.hostname.endsWith('.' + TOPSTREAM_HOST)
  } catch {
    return false
  }
}

/**
 * Réécrit les URLs relatives/absolues dans un manifest M3U8
 * pour qu'elles passent toutes par ce proxy.
 */
function rewriteM3u8(body: string, baseUrl: string, proxyBase: string): string {
  const base = new URL(baseUrl)

  return body
    .split('\n')
    .map(line => {
      const trimmed = line.trim()

      // Ignorer les directives et lignes vides
      if (!trimmed || trimmed.startsWith('#')) {
        // Réécrire URI= dans les directives (ex: #EXT-X-KEY, #EXT-X-MAP)
        return trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
          const absolute = resolveUrl(uri, base)
          if (!absolute) return _match
          return `URI="${proxyBase}?url=${encodeURIComponent(absolute)}"`
        })
      }

      // Lignes de segments (.ts, .m3u8, .aac, etc.)
      const absolute = resolveUrl(trimmed, base)
      if (!absolute) return line
      return `${proxyBase}?url=${encodeURIComponent(absolute)}`
    })
    .join('\n')
}

function resolveUrl(href: string, base: URL): string | null {
  try {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href
    }
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return new NextResponse('URL manquante', { status: 400 })
  }

  if (!isSafeTarget(url)) {
    return new NextResponse('Domaine non autorisé pour ce proxy', { status: 403 })
  }

  try {
    const upstream = await fetch(url, {
      headers: SPOOF_HEADERS,
      redirect: 'follow',
    })

    if (!upstream.ok) {
      return new NextResponse(
        `Erreur upstream : ${upstream.status} ${upstream.statusText}`,
        { status: upstream.status },
      )
    }

    const contentType = upstream.headers.get('content-type') || ''

    // ── M3U8 : on réécrit le manifest ────────────────────────────────────────
    if (
      url.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegurl')
    ) {
      const body = await upstream.text()
      const proxyBase = new URL('/api/stream-proxy', request.nextUrl.origin).toString()
      const rewritten = rewriteM3u8(body, url, proxyBase)

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // ── Segments TS, MP4, etc. : stream direct ────────────────────────────────
    const responseHeaders = new Headers({
      'Content-Type': contentType || 'video/mp2t',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    })
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) responseHeaders.set('Content-Length', contentLength)

    return new NextResponse(upstream.body, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (err: any) {
    console.error('[stream-proxy]', err)
    return new NextResponse(err.message || 'Erreur réseau', { status: 502 })
  }
}
