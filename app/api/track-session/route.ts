import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Géolocalisation IP via ip-api.com (gratuit, pas de clé requise)
async function geolocateIP(ip: string) {
  try {
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
      return { city: 'Local', country: 'Dev', region: '' }
    }
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,regionName&lang=fr`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return { city: 'Inconnu', country: '', region: '' }
    const data = await res.json()
    return { city: data.city || 'Inconnu', country: data.country || '', region: data.regionName || '' }
  } catch {
    return { city: 'Inconnu', country: '', region: '' }
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { userId, username, contentType, tmdbId, title, poster, season, episode } = body

  // Récupérer l'IP réelle
  const ip =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'

  const supabase = await createClient()

  // Géolocaliser l'IP
  const geo = await geolocateIP(ip)

  const sessionData = {
    ip,
    city: geo.city,
    country: geo.country,
    region: geo.region,
    user_id: userId || null,
    username: username || null,
    content_type: contentType,
    tmdb_id: tmdbId,
    title,
    poster: poster || null,
    season: season || null,
    episode: episode || null,
    last_seen: new Date().toISOString(),
  }

  // Upsert session active (1 session par IP)
  await supabase
    .from('active_sessions')
    .upsert(sessionData, { onConflict: 'ip' })

  // Insérer dans l'historique
  await supabase
    .from('ip_history')
    .insert({
      ...sessionData,
      viewed_at: new Date().toISOString(),
    })

  // Nettoyer les sessions inactives depuis plus de 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  await supabase
    .from('active_sessions')
    .delete()
    .lt('last_seen', fiveMinAgo)

  return NextResponse.json({ ok: true })
}
