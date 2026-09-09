import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
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

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')

  if (!rawUrl) {
    return new NextResponse('URL manquante', { status: 400 })
  }

  try {
    if (rawUrl.length > 2000 || /[<>]|DOCTYPE|Just a moment/i.test(rawUrl)) {
      return new NextResponse('URL invalide', { status: 400 })
    }

    let target = rawUrl
    let parsed = new URL(target)
    if (!/^https?:$/i.test(parsed.protocol)) {
      return new NextResponse('URL invalide', { status: 400 })
    }

    if (parsed.hostname.toLowerCase().includes('cinflix.xyz')) {
      const resolved = await resolveCinflixApi(target)
      if (!resolved) {
        return new NextResponse('Cinflix n\'a pas renvoyé de flux', { status: 502 })
      }
      target = resolved
      parsed = new URL(target)
    }

    const host = parsed.hostname.toLowerCase()
    const isTopstream = host.includes('topstream.cloud')
    const isCinflixCdn = host.includes('blink-n3')
    const range = request.headers.get('range')
    const referer = isTopstream
      ? 'https://purstream.ad/'
      : isCinflixCdn
        ? `${CINFLIX_ORIGIN}/`
        : parsed.origin + '/'

    const upstream = await fetch(target, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        Referer: referer,
        ...(isTopstream && { Origin: 'https://purstream.ad' }),
        ...(isCinflixCdn && { Origin: CINFLIX_ORIGIN }),
        ...(range && { Range: range }),
      },
      redirect: 'follow',
    })

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(`Erreur upstream : ${upstream.status} ${upstream.statusText}`, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4'

    if (contentType.includes('text/html')) {
      return new NextResponse('Le lien fourni est une page HTML, pas un fichier MP4 direct. Résolvez le lien d\'abord.', { status: 400 })
    }

    const headers = new Headers()
    headers.set('Content-Type', contentType.includes('video') ? contentType : 'video/mp4')
    headers.set('Cache-Control', 'no-store')
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Access-Control-Allow-Origin', '*')

    const contentRange = upstream.headers.get('content-range')
    if (contentRange) headers.set('Content-Range', contentRange)
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) headers.set('Content-Length', contentLength)

    const status = upstream.status === 206 ? 206 : 200

    return new NextResponse(upstream.body, { status, headers })
  } catch (err: any) {
    console.error('[proxy-download]', err)
    return new NextResponse(err.message || 'Erreur réseau', { status: 502 })
  }
}
