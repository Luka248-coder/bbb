import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { request_id, user_id } = await req.json()
  const supabase = await createClient()

  // Check if already voted
  const { data: existing } = await supabase
    .from('request_votes')
    .select('id')
    .eq('request_id', request_id)
    .eq('user_id', user_id)
    .single()

  if (existing) {
    // Remove vote
    await supabase.from('request_votes').delete().eq('id', existing.id)
    await supabase.rpc('decrement_request_votes', { req_id: request_id })
    return NextResponse.json({ voted: false })
  } else {
    // Add vote
    await supabase.from('request_votes').insert({ request_id, user_id })
    await supabase.rpc('increment_request_votes', { req_id: request_id })
    return NextResponse.json({ voted: true })
  }
}

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id')
  const supabase = await createClient()

  const { data } = await supabase
    .from('request_votes')
    .select('request_id')
    .eq('user_id', user_id)

  return NextResponse.json({ voted_ids: (data || []).map((v: any) => v.request_id) })
}
