import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 300

/**
 * Proxy de lecture MP4 : stream le fichier en supportant les requêtes Range
 * (byte-range) afin que la lecture et le seek fonctionnent dans le <video>.
 * Le vrai lien CDN est passé en ?url= et le Referer purstream.ad est spoofé
 * pour topstream.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return new NextResponse('URL manquante', { status: 400 })
  }

  try {
    if (!url || url.length > 2000 || /[<>]|DOCTYPE|Just a moment/i.test(url)) {
      return new NextResponse('URL invalide', { status: 400 })
    }

    const parsed = new URL(url)
    if (!/^https?:$/i.test(parsed.protocol)) {
      return new NextResponse('URL invalide', { status: 400 })
    }

    const host = parsed.hostname.toLowerCase()
    if (host.includes('cinflix.xyz')) {
      return new NextResponse('Ce flux doit être lu directement, pas via le proxy', { status: 400 })
    }

    const isTopstream = host.includes('topstream.cloud')
    const isCinflixCdn = host.includes('blink-n3')
    const range = request.headers.get('range')
    const referer = isTopstream
      ? 'https://purstream.ad/'
      : isCinflixCdn
        ? 'https://cinflix.xyz/'
        : parsed.origin + '/'

    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': referer,
        ...(isTopstream && { 'Origin': 'https://purstream.ad' }),
        ...(isCinflixCdn && { 'Origin': 'https://cinflix.xyz' }),
        // On relaie la requête Range du navigateur pour permettre le seek/streaming
        ...(range && { 'Range': range }),
      },
      redirect: 'follow',
    })

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(`Erreur upstream : ${upstream.status} ${upstream.statusText}`, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4'

    // Si on reçoit du HTML, le lien n'est pas encore résolu
    if (contentType.includes('text/html')) {
      return new NextResponse('Le lien fourni est une page HTML, pas un fichier MP4 direct. Résolvez le lien d\'abord.', { status: 400 })
    }

    const headers = new Headers()
    headers.set('Content-Type', contentType.includes('video') ? contentType : 'video/mp4')
    headers.set('Cache-Control', 'no-store')
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Access-Control-Allow-Origin', '*')

    // On recopie les en-têtes de plage renvoyés par l'upstream
    const contentRange = upstream.headers.get('content-range')
    if (contentRange) headers.set('Content-Range', contentRange)
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) headers.set('Content-Length', contentLength)

    // 206 si l'upstream a répondu à une requête Range, sinon 200
    const status = upstream.status === 206 ? 206 : 200

    return new NextResponse(upstream.body, { status, headers })

  } catch (err: any) {
    console.error('[proxy-download]', err)
    return new NextResponse(err.message || 'Erreur réseau', { status: 502 })
  }
}
