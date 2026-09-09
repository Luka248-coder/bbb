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

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.+$/, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (h === '::1' || h === '0.0.0.0') return true
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) return false
  const p = h.split('.').map(Number)
  if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true
  if (p[0] === 169 && p[1] === 254) return true
  if (p[0] === 192 && p[1] === 168) return true
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true
  return false
}

function isSafeTarget(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    return !isBlockedHost(u.hostname)
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

function rewriteM3u8(body: string, baseUrl: string, origin: string, direct: boolean): string {
  const base = new URL(baseUrl)
  return body
    .split('\n')
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ''

      // Safari refuse souvent un master HLS dont les sous-titres pointent vers un .vtt brut.
      if (trimmed.startsWith('#EXT-X-MEDIA:') && /TYPE=SUBTITLES/i.test(trimmed)) return ''
      if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
        return trimmed.replace(/,?SUBTITLES="[^"]*"/gi, '')
      }

      if (trimmed.startsWith('#')) {
        return trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
          const absolute = resolveUrl(uri, base)
          if (!absolute) return _match
          if (direct) return `URI="${absolute}"`
          const path = absolute.includes('.m3u8') ? '/api/hls/master.m3u8' : '/api/hls/seg.ts'
          return `URI="${origin}${path}?url=${encodeURIComponent(absolute)}"`
        })
      }

      const absolute = resolveUrl(trimmed, base)
      if (!absolute) return line
      if (direct) return absolute
      const path = absolute.includes('.m3u8') ? '/api/hls/master.m3u8' : '/api/hls/seg.ts'
      return `${origin}${path}?url=${encodeURIComponent(absolute)}`
    })
    .join('\n')
}

export async function proxyTopstreamMedia(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const direct = request.nextUrl.searchParams.get('direct') === '1'

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
      const rewritten = rewriteM3u8(body, url, request.nextUrl.origin, direct)

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
