import { NextRequest, NextResponse } from 'next/server'

/**
 * Résout le vrai lien MP4 depuis une URL fileditchfiles.me.
 * La page est un player HTML5 - on extrait la source vidéo depuis le HTML.
 */
export async function POST(request: NextRequest) {
  const { url } = await request.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
  }

  // Si c'est déjà un lien CDN direct (pas fileditchfiles), on le retourne tel quel
  if (!url.includes('fileditchfiles.me')) {
    return NextResponse.json({ url, resolved: false })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      redirect: 'follow',
    })

    const contentType = res.headers.get('content-type') || ''
    
    // Si la réponse est déjà un MP4, l'URL est directe
    if (contentType.includes('video/') || contentType.includes('application/octet-stream')) {
      return NextResponse.json({ url, resolved: false, note: 'URL already direct' })
    }

    const html = await res.text()

    // Patterns pour extraire l'URL MP4 du HTML/JS
    const patterns = [
      // <source src="https://...mp4">
      /<source[^>]+src=["']([^"']+\.mp4[^"']*)['"]/i,
      // <video src="https://...mp4">
      /<video[^>]+src=["']([^"']+\.mp4[^"']*)['"]/i,
      // src: "https://...mp4"  (JS)
      /['"](https?:\/\/[^'"]+\.mp4[^'"]*)['"]/i,
      // file: "https://...mp4"  (JS players like JWPlayer, Plyr)
      /file["']?\s*:\s*["'](https?:\/\/[^'"]+\.mp4[^'"]*)['"]/i,
      // "url": "https://...mp4"  (JSON)
      /"url"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/i,
      // src = "https://...mp4"  (JS)
      /src\s*=\s*["'](https?:\/\/[^'"]+\.mp4[^'"]*)['"]/i,
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].startsWith('http')) {
        const found = match[1]
        // Ignorer les thumbnails/posters
        if (!found.includes('thumb') && !found.includes('poster') && !found.includes('preview')) {
          return NextResponse.json({ url: found, resolved: true, source: url })
        }
      }
    }

    // Si rien trouvé, retourner le HTML pour débugger (tronqué)
    return NextResponse.json({ 
      error: 'Aucun lien MP4 trouvé dans la page',
      debug_html_snippet: html.substring(0, 2000),
      status: res.status,
      content_type: contentType,
    }, { status: 404 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur réseau' }, { status: 502 })
  }
}
