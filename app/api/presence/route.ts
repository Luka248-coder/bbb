import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientIp, geolocateIp } from '@/lib/geo-ip'

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

function cutoffIso(ms = 2 * 60 * 1000) {
  return new Date(Date.now() - ms).toISOString()
}

export async function GET() {
  const supabase = await createClient()
  const cutoff = cutoffIso()

  const { data } = await supabase.from('active_sessions').select('page, content_type, last_seen, updated_at')
  const rows = (data || []).filter((s: any) => {
    const t = s.last_seen || s.updated_at
    return t && t >= cutoff
  })

  return NextResponse.json({
    total: rows.length,
    watching_movie: rows.filter((s: any) => s.page === 'watch_movie' || s.content_type === 'movie').length,
    watching_series: rows.filter((s: any) => s.page === 'watch_series' || s.content_type === 'series').length,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json().catch(() => ({}))
  const {
    user_id,
    username,
    page,
    content_type,
    tmdb_id,
    title,
    poster,
    season,
    episode,
  } = body || {}

  const ip = getClientIp(req)
  const geo = await geolocateIp(ip)
  const now = new Date().toISOString()
  const uid = typeof user_id === 'string' && isUuid(user_id) ? user_id : null

  const row: Record<string, unknown> = {
    ip,
    city: geo.city,
    country: geo.country,
    region: geo.region,
    user_id: uid,
    username: username || null,
    page: page || 'home',
    content_type: content_type || null,
    tmdb_id: tmdb_id ? Number(tmdb_id) : null,
    title: title || null,
    poster: poster || null,
    season: season ? Number(season) : null,
    episode: episode ? Number(episode) : null,
    last_seen: now,
    updated_at: now,
  }

  let { error } = await supabase.from('active_sessions').upsert(row, { onConflict: 'ip' })
  if (error && uid) {
    const retry = await supabase.from('active_sessions').upsert({ ...row, user_id: uid }, { onConflict: 'user_id' })
    error = retry.error
  }
  if (error) {
    await supabase.from('active_sessions').insert(row).then(() => {})
  }

  return NextResponse.json({ ok: true })
}
