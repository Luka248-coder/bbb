import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TMDB_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'

// GET : retourne le mode + les items hero
export async function GET() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('settings').select('value').eq('key', 'hero_mode').single()
  const { data: items } = await supabase.from('hero_items').select('*').order('position')
  return NextResponse.json({ mode: settings?.value || 'auto', items: items || [] })
}

// POST : update mode OU ajoute un item
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  if (body.mode !== undefined) {
    await supabase.from('settings').upsert({ key: 'hero_mode', value: body.mode }, { onConflict: 'key' })
    return NextResponse.json({ success: true })
  }

  if (body.tmdb_id && body.type) {
    // Fetch TMDB details
    const endpoint = body.type === 'movie' ? 'movie' : 'tv'
    const res = await fetch(`${TMDB}/${endpoint}/${body.tmdb_id}?api_key=${TMDB_KEY}&language=fr-FR`)
    const data = await res.json()
    const title = data.title || data.name || ''
    const poster_path = data.poster_path || null
    const backdrop_path = data.backdrop_path || null

    // Get next position
    const { data: existing } = await supabase.from('hero_items').select('position').order('position', { ascending: false }).limit(1)
    const position = existing?.length ? (existing[0].position + 1) : 0

    const { error } = await supabase.from('hero_items').insert({
      tmdb_id: body.tmdb_id, type: body.type, title, poster_path, backdrop_path, position
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, title })
  }

  return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
}

// DELETE : supprime un item hero
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await supabase.from('hero_items').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
