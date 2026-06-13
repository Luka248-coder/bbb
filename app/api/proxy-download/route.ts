import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300 // 5 min max pour Vercel

/**
 * Proxy de téléchargement : stream le fichier MP4 avec Content-Disposition: attachment
 * Le vrai lien CDN (résolu depuis fileditchfiles) est passé en ?url=
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const filename = request.nextUrl.searchParams.get('filename') || 'video.mp4'

  if (!url) {
    return new NextResponse('URL manquante', { status: 400 })
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': new URL(url).origin + '/',
      },
      redirect: 'follow',
    })

    if (!upstream.ok) {
      return new NextResponse(`Erreur upstream : ${upstream.status} ${upstream.statusText}`, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4'
    const contentLength = upstream.headers.get('content-length')

    // Si on reçoit du HTML, le lien n'est pas encore résolu
    if (contentType.includes('text/html')) {
      return new NextResponse('Le lien fourni est une page HTML, pas un fichier MP4 direct. Résolvez le lien d\'abord.', { status: 400 })
    }

    const headers = new Headers()
    headers.set('Content-Type', contentType.includes('video') ? contentType : 'video/mp4')
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    headers.set('Cache-Control', 'no-store')
    if (contentLength) headers.set('Content-Length', contentLength)

    // Stream direct sans buffer en mémoire
    return new NextResponse(upstream.body, { status: 200, headers })

  } catch (err: any) {
    console.error('[proxy-download]', err)
    return new NextResponse(err.message || 'Erreur réseau', { status: 502 })
  }
}
