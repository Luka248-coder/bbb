import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json([])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { user_id, tmdb_id, content_type, title, poster } = body

  if (!user_id || !tmdb_id || !content_type || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('favorites')
    .insert({ user_id, tmdb_id, content_type, title, poster })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already in favorites' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const tmdb_id = request.nextUrl.searchParams.get('tmdb_id')
  const content_type = request.nextUrl.searchParams.get('content_type')
  const user_id = request.nextUrl.searchParams.get('user_id')

  if (!tmdb_id || !content_type || !user_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user_id)
    .eq('tmdb_id', parseInt(tmdb_id))
    .eq('content_type', content_type)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}