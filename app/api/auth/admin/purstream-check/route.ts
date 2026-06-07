import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PURSTREAM_BASE = 'https://api.purstream.ch/api/v1'
const HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://purstream.ch/',
  'Origin': 'https://purstream.ch',
}

async function checkPurstream(title: string, tmdbId: number, type: 'movie' | 'series'): Promise<boolean> {
  const endpoints = [
    `${PURSTREAM_BASE}/media/tmdb/${tmdbId}`,
    `${PURSTREAM_BASE}/media/tmdb/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}`,
  ]
  for (const url of endpoints) {
    try {
      const r = await fetch(url, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(8000) })
      if (r.ok) { const d = await r.json(); if (d?.data?.items?.id || d?.data?.id || d?.id) return true }
    } catch {}
  }
  try {
    const r = await fetch(`${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`, {
      headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(8000)
    })
    if (!r.ok) return false
    const d = await r.json()
    const si = d?.data?.items
    const results: any[] = si ? [...(si.movies?.items || []), ...(si.series?.items || [])] : (Array.isArray(d) ? d : [])
    const match = results.find((r: any) => String(r.tmdbId || r.tmdb_id) === String(tmdbId))
    return !!(match?.id)
  } catch { return false }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const type = req.nextUrl.searchParams.get('type') || 'movie'
  const table = type === 'movie' ? 'movies' : 'series'
  const titleField = type === 'movie' ? 'title' : 'name'

  const [{ data: verified }, { data: allContent }] = await Promise.all([
    supabase.from('purstream_verified').select('tmdb_id').eq('content_type', type),
    supabase.from(table).select(`id, tmdb_id, ${titleField}, popularity`).order('popularity', { ascending: false })
  ])

  const verifiedIds = new Set((verified || []).map((v: any) => v.tmdb_id))
  const pending = (allContent || []).filter((c: any) => !verifiedIds.has(c.tmdb_id))

  return NextResponse.json({
    total: (allContent || []).length,
    verified: verifiedIds.size,
    pending: pending.length,
    items: pending.slice(0, 300).map((c: any) => ({
      tmdb_id: c.tmdb_id,
      title: c[titleField],
      popularity: c.popularity,
    }))
  })
}

export async function POST(req: NextRequest) {
  const { tmdb_id, title, type } = await req.json()
  const supabase = await createClient()

  const { data: existing } = await supabase.from('purstream_verified').select('available').eq('tmdb_id', tmdb_id).eq('content_type', type).single()
  if (existing) return NextResponse.json({ tmdb_id, available: existing.available, cached: true })

  const available = await checkPurstream(title, tmdb_id, type as 'movie' | 'series')

  await supabase.from('purstream_verified').upsert({
    tmdb_id, content_type: type, available, checked_at: new Date().toISOString(),
  }, { onConflict: 'tmdb_id,content_type' })

  return NextResponse.json({ tmdb_id, title, available })
}

export async function DELETE(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const supabase = await createClient()
  if (type) await supabase.from('purstream_verified').delete().eq('content_type', type)
  else await supabase.from('purstream_verified').delete().neq('tmdb_id', 0)
  return NextResponse.json({ success: true })
}
