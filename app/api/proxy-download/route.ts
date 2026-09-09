import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

const CINFLIX_ORIGIN = 'https://cinflix.xyz'
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function resolveCinflixApi(apiUrl: string): Promise<string | null> {
  const res = await fetch(apiUrl, {
    method: 'GET',
    redirect: 'manual',
    cache: 'no-store',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'User-Agent': BROWSER_UA,
      Referer: `${CINFLIX_ORIGIN}/`,
      Origin: CINFLIX_ORIGIN,
    },
  })
  const loc = res.headers.get('location')
  try { await res.body?.cancel() } catch {}
  if (!loc) return null
  try {
    return new URL(loc, apiUrl).toString()
  } catch {
    return null
  }
}

async function resolveTarget(rawUrl: string): Promise<URL> {
  let target = rawUrl
  let parsed = new URL(target)
  if (parsed.hostname.toLowerCase().includes('cinflix.xyz')) {
    const resolved = await resolveCinflixApi(target)
    if (!resolved) throw new Error('Cinflix n\'a pas renvoyé de flux')
    target = resolved
    parsed = new URL(target)
  }
  return parsed
}

function mediaHeaders(target: URL, range: string | null): Record<string, string> {
  const host = target.hostname.toLowerCase()
  const isTopstream = host.includes('topstream.cloud')
  const isCinflixCdn = host.includes('blink-n3')
  const referer = isTopstream
    ? 'https://purstream.ad/'
    : isCinflixCdn
      ? `${CINFLIX_ORIGIN}/`
      : target.origin + '/'

  return {
    'User-Agent': BROWSER_UA,
    Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9',
    Referer: referer,
    ...(isTopstream ? { Origin: 'https://purstream.ad' } : {}),
    ...(isCinflixCdn ? { Origin: CINFLIX_ORIGIN } : {}),
    Range: range || 'bytes=0-',
  }
}

async function fetchMedia(target: URL, range: string | null): Promise<Response> {
  const headers = mediaHeaders(target, range)
  let url = target.toString()
  let res = await fetch(url, { headers, redirect: 'manual', cache: 'no-store' })

  for (let i = 0; i < 4 && res.status >= 300 && res.status < 400; i++) {
    const loc = res.headers.get('location')
    try { await res.body?.cancel() } catch {}
    if (!loc) break
    url = new URL(loc, url).toString()
    res = await fetch(url, { headers, redirect: 'manual', cache: 'no-store' })
  }

  return res
}

function passThroughHeaders(upstream: Response): Headers {
  const headers = new Headers()
  const contentType = upstream.headers.get('content-type') || 'video/mp4'
  headers.set('Content-Type', contentType.includes('video') || contentType.includes('octet-stream') ? contentType : 'video/mp4')
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'private, max-age=0, must-revalidate')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type')

  const contentRange = upstream.headers.get('content-range')
  if (contentRange) headers.set('Content-Range', contentRange)
  const contentLength = upstream.headers.get('content-length')
  if (contentLength) headers.set('Content-Length', contentLength)
  const etag = upstream.headers.get('etag')
  if (etag) headers.set('ETag', etag)
  const lastModified = upstream.headers.get('last-modified')
  if (lastModified) headers.set('Last-Modified', lastModified)

  return headers
}

async function proxy(request: NextRequest, withBody: boolean) {
  const rawUrl = request.nextUrl.searchParams.get('url')

  if (!rawUrl) {
    return new NextResponse('URL manquante', { status: 400 })
  }

  try {
    if (rawUrl.length > 2000 || /[<>]|DOCTYPE|Just a moment/i.test(rawUrl)) {
      return new NextResponse('URL invalide', { status: 400 })
    }

    const parsed = new URL(rawUrl)
    if (!/^https?:$/i.test(parsed.protocol)) {
      return new NextResponse('URL invalide', { status: 400 })
    }

    const target = await resolveTarget(rawUrl)
    const range = request.headers.get('range')
    const upstream = await fetchMedia(target, withBody ? range : (range || 'bytes=0-0'))

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(`Erreur upstream : ${upstream.status} ${upstream.statusText}`, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4'
    if (contentType.includes('text/html')) {
      return new NextResponse('Le lien fourni est une page HTML, pas un fichier MP4 direct. Résolvez le lien d\'abord.', { status: 400 })
    }

    const headers = passThroughHeaders(upstream)
    const finalStatus = upstream.status === 206 || upstream.headers.get('content-range')
      ? 206
      : upstream.status

    if (!withBody) {
      try { await upstream.body?.cancel() } catch {}
      return new NextResponse(null, { status: finalStatus, headers })
    }

    return new NextResponse(upstream.body, { status: finalStatus, headers })
  } catch (err: any) {
    console.error('[proxy-download]', err)
    return new NextResponse(err.message || 'Erreur réseau', { status: 502 })
  }
}

export async function GET(request: NextRequest) {
  return proxy(request, true)
}

export async function HEAD(request: NextRequest) {
  return proxy(request, false)
}
