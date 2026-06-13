import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { url } = await request.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
  }

  // Si c'est pas fileditchfiles, retourner tel quel
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
    const rawMatches = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/g) || []
    const cleaned = [...new Set(rawMatches.map(u => u.replace(/&amp;/g, '&')))]
    const candidates = cleaned.filter(u =>
      !u.includes('fileditchfiles.me') &&
      !u.includes('abuse.') &&
      !u.includes('report.php')
    )

    if (candidates.length > 0) {
      const signed = candidates.find(u => u.includes('expires=')) || candidates[0]
      return NextResponse.json({ url: signed, resolved: true })
    }

    return NextResponse.json({ error: 'Aucun lien MP4 trouvé' }, { status: 404 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
