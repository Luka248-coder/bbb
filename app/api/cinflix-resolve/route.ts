import { NextRequest, NextResponse } from 'next/server'
import { getCinflixStreamUrl } from '@/lib/cinflix'

export const runtime = 'nodejs'
export const maxDuration = 15

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') === 'tv' || searchParams.get('type') === 'series' ? 'tv' : 'movie'
  const id = Number(searchParams.get('id') || 0)
  const season = Number(searchParams.get('s') || 1)
  const episode = Number(searchParams.get('e') || 1)

  if (!id) {
    return NextResponse.json({ url: null }, { status: 400 })
  }

  const url = await getCinflixStreamUrl(type, id, season, episode)
  if (!url) {
    return NextResponse.json({ url: null })
  }

  return NextResponse.json({ url })
}
