import { NextRequest, NextResponse } from 'next/server'
import { cinflixStreamApiUrl } from '@/lib/cinflix-url'
import { resolveCinflixApiUrl } from '@/lib/cinflix'

export async function middleware(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') === 'tv' || searchParams.get('type') === 'series' ? 'tv' : 'movie'
  const id = Number(searchParams.get('id') || 0)
  const season = Number(searchParams.get('s') || 1)
  const episode = Number(searchParams.get('e') || 1)

  if (!id) {
    return NextResponse.json({ url: null }, { status: 400 })
  }

  const apiUrl = cinflixStreamApiUrl(type, id, season, episode)
  const url = await resolveCinflixApiUrl(apiUrl)
  return NextResponse.json({ url })
}

export const config = {
  matcher: '/api/cinflix-resolve',
}
