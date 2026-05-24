import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { tmdb_id, content_type, title, season, episode } = await request.json()
  const supabase = await createClient()

  await supabase.from('player_errors').insert({
    tmdb_id,
    content_type,
    title,
    season: season ?? null,
    episode: episode ?? null,
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('player_errors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json(data || [])
}
