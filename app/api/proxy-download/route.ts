import { NextRequest, NextResponse } from 'next/server'

/**
 * Route proxy qui télécharge un fichier vidéo MP4 en forçant le téléchargement.
 * Utilisé pour contourner les restrictions CORS et forcer le download navigateur.
 * Usage : /api/proxy-download?url=https://...&filename=film.mp4
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const filename = request.nextUrl.searchParams.get('filename') || 'video.mp4'

  if (!url) {
    return new NextResponse('URL manquante', { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': new URL(url).origin + '/',
      },
    })

    if (!response.ok) {
      return new NextResponse(`Erreur HTTP ${response.status}`, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'video/mp4'
    const contentLength = response.headers.get('content-length')

    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'no-store',
    })
    if (contentLength) headers.set('Content-Length', contentLength)

    return new NextResponse(response.body, { status: 200, headers })
  } catch (err: any) {
    return new NextResponse(err.message || 'Erreur réseau', { status: 502 })
  }
}
