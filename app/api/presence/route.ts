import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — lire les présences actives (pour l'admin)
export async function GET() {
  const supabase = await createClient()
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 min

  const { data, error } = await supabase
    .from('active_sessions')
    .select('user_id, page, updated_at')
    .gte('updated_at', cutoff)

  if (error) return NextResponse.json({ total: 0, watching_movie: 0, watching_series: 0 })

  const total = data.length
  const watching_movie = data.filter(s => s.page === 'watch_movie').length
  const watching_series = data.filter(s => s.page === 'watch_series').length

  return NextResponse.json({ total, watching_movie, watching_series })
}

// POST — ping de présence depuis le client
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { user_id, page } = await req.json()

  if (!user_id) return NextResponse.json({ ok: false })

  await supabase.from('active_sessions').upsert(
    { user_id, page: page || 'home', updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )

  return NextResponse.json({ ok: true })
}
