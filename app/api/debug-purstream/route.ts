import { NextRequest, NextResponse } from 'next/server'

const PURSTREAM_BASE = 'https://api.purstream.ac/api/v1'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') || '21 Jump Street'
  const purstreamId = searchParams.get('id')

  if (purstreamId) {
    // Mode sheet : voir la structure exacte
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    })
    const raw = await res.text()
    return NextResponse.json({ status: res.status, raw: JSON.parse(raw) })
  }

  // Mode search
  const res = await fetch(`${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
  })
  const raw = await res.text()
  try {
    return NextResponse.json({ status: res.status, raw: JSON.parse(raw) })
  } catch {
    return NextResponse.json({ status: res.status, raw })
  }
}
