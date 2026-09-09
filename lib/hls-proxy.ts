import { NextRequest, NextResponse } from 'next/server'

const SPOOF_REFERER = 'https://purstream.ad/'
const SPOOF_ORIGIN = 'https://purstream.ad'

const SPOOF_HEADERS: Record<string, string> = {
  Referer: SPOOF_REFERER,
  Origin: SPOOF_ORIGIN,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
}

function isSafeTarget(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return h === 'topstream.cloud' || h.endsWith('.topstream.cloud')
  } catch {
    return false
  }
}

function resolveUrl(href: string, base: URL): string | null {
  try {
    if (href.startsWith('http://') || href.startsWith('https://')) return href
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

function rewriteM3u8(body: string, baseUrl: string, origin: string): string {
  const base = new URL(baseUrl)
  return body
    .split('\n')
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        return trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
          const absolute = resolveUrl(uri, base)
          if (!absolute) return _match
          const path = absolute.includes('.m3u8') ? '/api/hls/master.m3u8' : '/api/hls/seg.ts'
          return `URI="${origin}${path}?url=${encodeURIComponent(absolute)}"`
        })
      }
      const absolute = resolveUrl(trimmed, base)
      if (!absolute) return line
      const path = absolute.includes('.m3u8') ? '/api/hls/master.m3u8' : '/api/hls/seg.ts'
      return `${origin}${path}?url=${encodeURIComponent(absolute)}`
    })
    .join('\n')
}

export async function proxyTopstreamMedia(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return new NextResponse('URL manquante', { status: 400 })
  }

  if (!isSafeTarget(url)) {
    return new NextResponse('Domaine non autorisé pour ce proxy', { status: 403 })
  }

  try {
    const range = request.headers.get('range')
    const isPlaylist = url.includes('.m3u8')
    const upstream = await fetch(url, {
      headers: {
        ...SPOOF_HEADERS,
        ...(!isPlaylist && range ? { Range: range } : {}),
      },
      redirect: 'follow',
    })

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(
        `Erreur upstream : ${upstream.status} ${upstream.statusText}`,
        { status: upstream.status },
      )
    }

    const contentType = upstream.headers.get('content-type') || ''

    if (
      isPlaylist ||
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegurl')
    ) {
      const body = await upstream.text()
      const rewritten = rewriteM3u8(body, url, request.nextUrl.origin)

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const responseHeaders = new Headers({
      'Content-Type': contentType || 'video/mp2t',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    })
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) responseHeaders.set('Content-Length', contentLength)
    const contentRange = upstream.headers.get('content-range')
    if (contentRange) responseHeaders.set('Content-Range', contentRange)

    return new NextResponse(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers: responseHeaders,
    })
  } catch (err: any) {
    console.error('[hls-proxy]', err)
    return new NextResponse(err.message || 'Erreur réseau', { status: 502 })
  }
}
