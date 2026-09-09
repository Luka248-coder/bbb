import { NextRequest, NextResponse } from 'next/server'
import { cinflixStreamApiUrl } from '@/lib/cinflix-url'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') === 'tv' || request.nextUrl.searchParams.get('type') === 'series'
    ? 'tv'
    : 'movie'
  const id = Number(request.nextUrl.searchParams.get('id') || 0)
  if (!id) return new NextResponse('id manquant', { status: 400 })
  const season = Number(request.nextUrl.searchParams.get('s') || 1)
  const episode = Number(request.nextUrl.searchParams.get('e') || 1)
  const dest = cinflixStreamApiUrl(type, id, season, episode)
  const res = NextResponse.redirect(dest, 302)
  res.headers.set('Cache-Control', 'no-store')
  return res
}
