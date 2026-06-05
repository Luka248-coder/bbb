import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

async function getBestBackdrop(type: 'movie' | 'tv', tmdbId: number): Promise<string | null> {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/${type}/${tmdbId}/images?api_key=${TMDB_API_KEY}`)
    const data = await res.json()
    const backdrops = (data.backdrops || [])
      .filter((b: any) => b.aspect_ratio > 1.7)
      .sort((a: any, b: any) => b.vote_average - a.vote_average)
    return backdrops[0]?.file_path || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const { offset = 0, contentType = 'movie' } = await request.json().catch(() => ({}))
  const BATCH = 5

  const supabase = await createClient()
  const table = contentType === 'movie' ? 'movies' : 'series'
  const tmdbType = contentType === 'movie' ? 'movie' : 'tv'

  const { data: items, count } = await supabase
    .from(table)
    .select('id, tmdb_id, backdrop_path', { count: 'exact' })
    .range(offset, offset + BATCH - 1)

  if (!items || items.length === 0) {
    return NextResponse.json({ done: true, contentType, total: count ?? 0 })
  }

  let updated = 0
  for (const item of items) {
    const backdrop = await getBestBackdrop(tmdbType, item.tmdb_id)
    if (backdrop && backdrop !== item.backdrop_path) {
      await supabase.from(table).update({ backdrop_path: backdrop }).eq('id', item.id)
      updated++
    }
  }

  const nextOffset = offset + BATCH
  const hasMore = nextOffset < (count ?? 0)

  return NextResponse.json({
    done: !hasMore,
    updated,
    processed: items.length,
    nextOffset: hasMore ? nextOffset : null,
    nextType: hasMore ? contentType : (contentType === 'movie' ? 'series' : null),
    total: count ?? 0,
  })
}
