import { NextRequest, NextResponse } from 'next/server'

/**
 * Résout la vraie URL MP4 depuis une URL fileditchfiles.me
 * L'URL de la page n'est pas l'URL directe — on fetch la page et on extrait la source vidéo.
 */
export async function POST(request: NextRequest) {
  const { url } = await request.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Referer': 'https://fileditchfiles.me/',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Erreur HTTP ${res.status}` }, { status: 502 })
    }

    const html = await res.text()

    // Cherche la vraie URL MP4 dans le HTML
    // Patterns courants : <source src="...mp4">, <video src="...mp4">, ou dans du JS
    const patterns = [
      /["']([^"']*\.mp4[^"']*)['"]/gi,
      /src:\s*["']([^"']*\.mp4[^"']*)['"]/gi,
      /file:\s*["']([^"']*\.mp4[^"']*)['"]/gi,
      /<source[^>]+src=["']([^"']+\.mp4[^"']*)['"]/gi,
      /<video[^>]+src=["']([^"']+\.mp4[^"']*)['"]/gi,
    ]

    const candidates: string[] = []
    for (const pattern of patterns) {
      let match
      pattern.lastIndex = 0
      while ((match = pattern.exec(html)) !== null) {
        const candidate = match[1]
        if (candidate.startsWith('http') && candidate.includes('.mp4')) {
          candidates.push(candidate)
        }
      }
    }

    // Dédoublonner
    const unique = [...new Set(candidates)]

    // Préférer les URLs qui ne ressemblent pas à des thumbnails/images
    const videoUrls = unique.filter(u =>
      !u.includes('thumb') && !u.includes('poster') && !u.includes('preview')
    )

    if (videoUrls.length > 0) {
      return NextResponse.json({ url: videoUrls[0], all: videoUrls })
    }

    // Fallback : si l'URL passée est déjà une URL directe .mp4, la retourner telle quelle
    if (url.includes('.mp4')) {
      return NextResponse.json({ url, all: [url] })
    }

    return NextResponse.json({ error: 'Aucune URL MP4 trouvée dans la page' }, { status: 404 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur réseau' }, { status: 502 })
  }
}
