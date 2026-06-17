import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getSession()
  if (!isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await createClient()

  const ip = request.nextUrl.searchParams.get('ip')

  if (ip) {
    // Historique d'une IP spécifique
    const { data } = await supabase
      .from('ip_history')
      .select('*')
      .eq('ip', ip)
      .order('viewed_at', { ascending: false })
      .limit(100)
    return NextResponse.json({ history: data || [] })
  }

  // Sessions actives
  const { data: active } = await supabase
    .from('active_sessions')
    .select('*')
    .order('last_seen', { ascending: false })

  // Historique toutes IPs (dernières 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: history } = await supabase
    .from('ip_history')
    .select('ip, city, country, username, title, content_type, viewed_at')
    .gte('viewed_at', since)
    .order('viewed_at', { ascending: false })

  // IPs uniques avec leur dernière ville/username
  const ipMap = new Map<string, any>()
  for (const row of history || []) {
    if (!ipMap.has(row.ip)) {
      ipMap.set(row.ip, { ip: row.ip, city: row.city, country: row.country, username: row.username })
    }
  }

  return NextResponse.json({
    active: active || [],
    uniqueIPs: Array.from(ipMap.values()),
  })
}
