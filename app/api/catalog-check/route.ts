import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const tmdbId = request.nextUrl.searchParams.get('tmdb_id')
  const type = request.nextUrl.searchParams.get('type')

  if (!tmdbId || !type) return NextResponse.json({ available: false })

  const supabase = await createClient()
  const table = type === 'movie' ? 'movies' : 'series'

  const { data } = await supabase
    .from(table)
    .select('id, video_url')
    .eq('tmdb_id', parseInt(tmdbId))
    .single()

  return NextResponse.json({ available: !!data })
}