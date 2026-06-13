import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { url } = await request.json()
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()
  
  // Retourner les infos utiles
  return NextResponse.json({
    status: res.status,
    content_type: contentType,
    final_url: res.url,
    html_length: text.length,
    // Les 3000 premiers caractères du HTML
    html_preview: text.substring(0, 3000),
    // Chercher toutes les URLs qui contiennent .mp4
    mp4_matches: (text.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/g) || []),
    // Chercher les src=
    src_matches: (text.match(/src=["'][^"']+["']/g) || []).slice(0, 20),
  })
}
