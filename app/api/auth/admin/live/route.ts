import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isStaff } from '@/lib/auth'

const LIVE_WINDOW_MS = 3 * 60 * 1000

export async function GET() {
  const user = await getSession()
  if (!isStaff(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const cutoff = new Date(Date.now() - LIVE_WINDOW_MS).toISOString()

  const { data, error } = await supabase
    .from('active_sessions')
    .select('*')
    .order('last_seen', { ascending: false })

  if (error) return NextResponse.json({ total: 0, watching: 0, visitors: [] })

  const live = (data || []).filter((s: any) => {
    const t = s.last_seen || s.updated_at
    return t && t >= cutoff
  })

  const tmdbIds = [...new Set(live.map((s: any) => s.tmdb_id).filter(Boolean))]
  let titles = new Map<number, { title: string; poster: string | null; type: string }>()
  if (tmdbIds.length) {
    const [{ data: movies }, { data: series }] = await Promise.all([
      supabase.from('movies').select('tmdb_id, title, poster_path').in('tmdb_id', tmdbIds),
      supabase.from('series').select('tmdb_id, name, poster_path').in('tmdb_id', tmdbIds),
    ])
    for (const m of movies || []) {
      titles.set(m.tmdb_id, {
        title: m.title,
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : null,
        type: 'movie',
      })
    }
    for (const s of series || []) {
      titles.set(s.tmdb_id, {
        title: s.name,
        poster: s.poster_path ? `https://image.tmdb.org/t/p/w185${s.poster_path}` : null,
        type: 'series',
      })
    }
  }

  const visitors = live.map((s: any) => {
    const meta = s.tmdb_id ? titles.get(s.tmdb_id) : null
    const watching = s.page === 'watch_movie' || s.page === 'watch_series' || s.content_type === 'movie' || s.content_type === 'series'
    return {
      id: s.id || s.ip || s.user_id,
      ip: s.ip || '—',
      city: s.city || '',
      country: s.country || '',
      region: s.region || '',
      username: s.username || (s.user_id ? 'Membre' : 'Invité'),
      user_id: s.user_id,
      page: s.page || 'home',
      watching,
      content_type: s.content_type || meta?.type || (s.page === 'watch_movie' ? 'movie' : s.page === 'watch_series' ? 'series' : null),
      tmdb_id: s.tmdb_id || null,
      title: s.title || meta?.title || null,
      poster: s.poster || meta?.poster || null,
      season: s.season || null,
      episode: s.episode || null,
      last_seen: s.last_seen || s.updated_at,
    }
  })

  const watchingList = visitors.filter(v => v.watching && v.title)

  return NextResponse.json({
    total: visitors.length,
    watching: watchingList.length,
    visitors,
    playbacks: watchingList,
  })
}
