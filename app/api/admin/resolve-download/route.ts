import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { url } = await request.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
  }

  if (!url.includes('fileditchfiles.me')) {
    return NextResponse.json({ url, resolved: false })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    const html = await res.text()

    // Extraire une par une les URLs MP4 avec un regex précis
    // On cherche src="URL" dans les balises <source> ou <video>
    const srcMatch = html.match(/src=["'](https?:\/\/[^"']+\.mp4[^"']*?)["']/)
    if (srcMatch) {
      const clean = srcMatch[1].replace(/&amp;/g, '&')
      if (!clean.includes('fileditchfiles.me') && !clean.includes('abuse.')) {
        return NextResponse.json({ url: clean, resolved: true })
      }
    }

    // Fallback : chercher le premier lien avec expires= dans tout le HTML
    const expiresMatch = html.match(/https?:\/\/[^\s"'<>&]+\.mp4[^\s"'<>]*expires=[^\s"'<>]+/)
    if (expiresMatch) {
      const clean = expiresMatch[0].replace(/&amp;/g, '&')
      if (!clean.includes('fileditchfiles.me')) {
        return NextResponse.json({ url: clean, resolved: true })
      }
    }

    return NextResponse.json({ error: 'Aucun lien MP4 trouvé' }, { status: 404 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
