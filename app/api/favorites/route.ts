import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profile_id')
  const userId = request.nextUrl.searchParams.get('user_id')

  if (!profileId && !userId) return NextResponse.json([])

  const supabase = await createClient()
  let query = supabase
    .from('favorites')
    .select('*')
    .order('created_at', { ascending: false })

  if (profileId) query = query.eq('profile_id', profileId)
  else query = query.eq('user_id', userId!)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { user_id, profile_id, tmdb_id, content_type, title, poster } = body

  if (!tmdb_id || !content_type || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const insertData: any = { tmdb_id, content_type, title, poster }
  if (profile_id) insertData.profile_id = profile_id
  if (user_id) insertData.user_id = user_id

  const { data, error } = await supabase
    .from('favorites')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already in favorites' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const tmdb_id = request.nextUrl.searchParams.get('tmdb_id')
  const content_type = request.nextUrl.searchParams.get('content_type')
  const profile_id = request.nextUrl.searchParams.get('profile_id')
  const user_id = request.nextUrl.searchParams.get('user_id')

  if (!tmdb_id || !content_type || (!profile_id && !user_id)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  let query = supabase
    .from('favorites')
    .delete()
    .eq('tmdb_id', tmdb_id)
    .eq('content_type', content_type)

  if (profile_id) query = query.eq('profile_id', profile_id)
  else query = query.eq('user_id', user_id!)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
