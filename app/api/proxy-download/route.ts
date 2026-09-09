import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300
export const preferredRegion = ['cdg1', 'fra1']

const CINFLIX_ORIGIN = 'https://cinflix.xyz'
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const CHUNK = 8 * 1024 * 1024

function parseRange(header: string | null): { start: number; end: number | null } {
  if (!header) return { start: 0, end: null }
  const m = header.match(/bytes=(\d*)-(\d*)/i)
  if (!m) return { start: 0, end: null }
  const start = m[1] ? parseInt(m[1], 10) : 0
  const end = m[2] ? parseInt(m[2], 10) : null
  return { start, end: Number.isFinite(end as number) ? end : null }
}

function boundRange(start: number, end: number | null, total: number | null): { start: number; end: number } {
  const safeStart = Math.max(0, start)
  const hardCap = safeStart + CHUNK - 1
  const fileEnd = total != null && total > 0 ? total - 1 : hardCap
  const requestedEnd = end == null ? hardCap : end
  return { start: safeStart, end: Math.min(Math.max(safeStart, requestedEnd), fileEnd, hardCap) }
}

function mediaHeaders(target: URL, range: string): Record<string, string> {
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
    Range: range,
    ...(isTopstream ? { Origin: 'https://purstream.ad' } : {}),
    ...(isCinflixCdn ? { Origin: CINFLIX_ORIGIN } : {}),
  }
}

async function fetchMedia(target: URL, range: string): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    let url = target.toString()
    let headers = mediaHeaders(new URL(url), range)
    let res = await fetch(url, { headers, redirect: 'manual', cache: 'no-store', signal: ctrl.signal })

    for (let i = 0; i < 4 && res.status >= 300 && res.status < 400; i++) {
      const loc = res.headers.get('location')
      try { await res.body?.cancel() } catch {}
      if (!loc) break
      url = new URL(loc, url).toString()
      headers = mediaHeaders(new URL(url), range)
      res = await fetch(url, { headers, redirect: 'manual', cache: 'no-store', signal: ctrl.signal })
    }

    return res
  } finally {
    clearTimeout(timer)
  }
}

function parseTotal(res: Response): number | null {
  const cr = res.headers.get('content-range')
  const m = cr?.match(/\/(\d+)\s*$/)
  if (m) return parseInt(m[1], 10)
  return null
}

async function probeTotal(target: URL): Promise<number | null> {
  try {
    const res = await fetchMedia(target, 'bytes=0-0')
    const total = parseTotal(res)
    try { await res.body?.cancel() } catch {}
    return total
  } catch {
    return null
  }
}

function passThroughHeaders(upstream: Response, start: number, end: number, total: number | null): Headers {
  const headers = new Headers()
  const contentType = upstream.headers.get('content-type') || 'video/mp4'
  headers.set('Content-Type', contentType.includes('video') || contentType.includes('octet-stream') ? contentType : 'video/mp4')
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'private, max-age=0, must-revalidate')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type')

  const size = end - start + 1
  headers.set('Content-Length', String(size))
  if (total != null && total > 0) {
    headers.set('Content-Range', `bytes ${start}-${end}/${total}`)
  } else {
    const cr = upstream.headers.get('content-range')
    if (cr) headers.set('Content-Range', cr)
  }

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
    if (rawUrl.length > 4000 || /[<>]|DOCTYPE|Just a moment/i.test(rawUrl)) {
      return new NextResponse('URL invalide', { status: 400 })
    }

    const parsed = new URL(rawUrl)
    if (!/^https?:$/i.test(parsed.protocol)) {
      return new NextResponse('URL invalide', { status: 400 })
    }

    const target = parsed
    const { start, end: clientEnd } = parseRange(request.headers.get('range'))
    const skipProbe = target.hostname.toLowerCase().includes('cinflix.xyz')
    const total = skipProbe ? null : await probeTotal(target)
    const bounded = boundRange(start, clientEnd, total)
    const upstream = await fetchMedia(target, `bytes=${bounded.start}-${bounded.end}`)

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(`Erreur upstream : ${upstream.status} ${upstream.statusText}`, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4'
    if (contentType.includes('text/html')) {
      return new NextResponse('Le lien fourni est une page HTML, pas un fichier MP4 direct.', { status: 400 })
    }

    const knownTotal = total ?? parseTotal(upstream)
    const headers = passThroughHeaders(upstream, bounded.start, bounded.end, knownTotal)

    if (!withBody) {
      try { await upstream.body?.cancel() } catch {}
      return new NextResponse(null, { status: 206, headers })
    }

    return new NextResponse(upstream.body, { status: 206, headers })
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
