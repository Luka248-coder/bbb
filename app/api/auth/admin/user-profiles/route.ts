import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const admin = await getSession()
  if (!isAdmin(admin)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id requis' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PATCH(request: NextRequest) {
  const admin = await getSession()
  if (!isAdmin(admin)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const { id, ...updates } = await request.json()

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const admin = await getSession()
  if (!isAdmin(admin)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const id = request.nextUrl.searchParams.get('id')
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
