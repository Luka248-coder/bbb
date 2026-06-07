import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const useMovie = Math.random() > 0.5
  const table = useMovie ? 'movies' : 'series'
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (!count) return NextResponse.json({ error: 'empty' }, { status: 404 })
  const offset = Math.floor(Math.random() * count)
  const { data } = await supabase.from(table).select('tmdb_id').range(offset, offset).single()
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ tmdb_id: data.tmdb_id, type: useMovie ? 'movie' : 'series' })
}
