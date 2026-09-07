import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Vide tous les liens vidéo définis (films OU séries) sans supprimer les contenus
export async function POST(request: NextRequest) {
  const { type } = await request.json()
  const supabase = await createClient()

  if (type === 'movie') {
    const { error, count } = await supabase
      .from('movies')
      .update({ video_url: null, updated_at: new Date().toISOString() }, { count: 'exact' })
      .not('video_url', 'is', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, cleared: count ?? 0 })
  }

  if (type === 'series') {
    // Les liens des séries sont portés par les épisodes
    const { error: epError, count: epCount } = await supabase
      .from('episodes')
      .update({ video_url: null }, { count: 'exact' })
      .not('video_url', 'is', null)

    if (epError) return NextResponse.json({ error: epError.message }, { status: 500 })

    // Certaines séries peuvent aussi avoir un video_url direct
    await supabase
      .from('series')
      .update({ video_url: null, updated_at: new Date().toISOString() })
      .not('video_url', 'is', null)

    return NextResponse.json({ success: true, cleared: epCount ?? 0 })
  }

  return NextResponse.json({ error: 'type invalide' }, { status: 400 })
}
