import { NextRequest, NextResponse } from 'next/server'

const DOWNLOAD_API = 'https://amorphous-stream-flux-hub.base44.app/api'

export async function POST(request: NextRequest) {
  const { tmdbId, type, season, episode } = await request.json()

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'tmdbId et type requis' }, { status: 400 })
  }

  try {
    let apiUrl: string

    if (type === 'movie') {
      apiUrl = `${DOWNLOAD_API}/movie/${tmdbId}/`
    } else {
      const s = String(season || 1).padStart(2, '0')
      const e = String(episode || 1).padStart(2, '0')
      apiUrl = `${DOWNLOAD_API}/serie/${tmdbId}/S${s}/E${e}/`
    }

    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ available: false, error: `API error: ${res.status}` })
    }

    const data = await res.json()

    // L'API retourne le lien direct ou indique "indisponible"
    const downloadUrl: string | null =
      data?.url || data?.download_url || data?.link || data?.file || null

    const isUnavailable =
      !downloadUrl ||
      (typeof downloadUrl === 'string' &&
        downloadUrl.toLowerCase().includes('indisponible'))

    if (isUnavailable) {
      return NextResponse.json({ available: false })
    }

    return NextResponse.json({ available: true, url: downloadUrl })
  } catch (err: any) {
    console.error('[resolve-download]', err)
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
