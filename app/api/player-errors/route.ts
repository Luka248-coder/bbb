import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[player-errors] Missing env vars', { url: !!url, key: !!key })
    return null
  }
  // On utilise @supabase/ssr avec la service role key et sans cookies (accès serveur pur)
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tmdb_id, content_type, title, season, episode } = body
    console.log('[player-errors] POST received', { tmdb_id, content_type, title, season, episode })

    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 })

    const { error } = await supabase.from('player_errors').insert({
      tmdb_id: tmdb_id ?? null,
      content_type: content_type ?? 'unknown',
      title: title ?? '',
      season: season ?? null,
      episode: episode ?? null,
    })

    if (error) {
      console.error('[player-errors] Supabase insert error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[player-errors] Inserted successfully')
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[player-errors] Unexpected error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json([])

    const { data, error } = await supabase
      .from('player_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[player-errors] GET error:', JSON.stringify(error))
      return NextResponse.json([])
    }

    return NextResponse.json(data || [])
  } catch (e) {
    console.error('[player-errors] GET error:', e)
    return NextResponse.json([])
  }
}
