const geoCache = new Map<string, { city: string; country: string; region: string; at: number }>()
const GEO_TTL = 30 * 60 * 1000

export function getClientIp(req: { headers: Headers }): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (
    req.headers.get('x-real-ip') ||
    forwarded ||
    req.headers.get('cf-connecting-ip') ||
    '127.0.0.1'
  )
}

export function isPrivateIp(ip: string) {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.')
  )
}

export async function geolocateIp(ip: string): Promise<{ city: string; country: string; region: string }> {
  const cached = geoCache.get(ip)
  if (cached && Date.now() - cached.at < GEO_TTL) {
    return { city: cached.city, country: cached.country, region: cached.region }
  }

  if (isPrivateIp(ip)) {
    const local = { city: 'Local', country: 'Dev', region: '' }
    geoCache.set(ip, { ...local, at: Date.now() })
    return local
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,regionName&lang=fr`, {
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return { city: 'Inconnu', country: '', region: '' }
    const data = await res.json()
    const geo = {
      city: data.city || 'Inconnu',
      country: data.country || '',
      region: data.regionName || '',
    }
    geoCache.set(ip, { ...geo, at: Date.now() })
    return geo
  } catch {
    return { city: 'Inconnu', country: '', region: '' }
  }
}
