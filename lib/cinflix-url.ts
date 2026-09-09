const CINFLIX_ORIGIN = 'https://cinflix.xyz'

export function cinflixStreamApiUrl(
  type: 'movie' | 'series' | 'tv',
  tmdbId: number,
  season = 1,
  episode = 1,
): string {
  const kind = type === 'movie' ? 'movie' : 'tv'
  const params = new URLSearchParams({ type: kind, id: String(tmdbId) })
  if (kind === 'tv') {
    params.set('s', String(season || 1))
    params.set('e', String(episode || 1))
  }
  return `${CINFLIX_ORIGIN}/api/media/stream?${params}`
}

export function isCinflixApiUrl(url: string): boolean {
  return /cinflix\.xyz\/api\/media\/stream/i.test(url)
}

export function isCinflixMediaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('cinflix') || host.includes('blink-n3')
  } catch {
    return false
  }
}

export function isPlayableMediaUrl(url: string): boolean {
  if (!url || url.length > 2000) return false
  if (/[<>]|DOCTYPE|Just a moment|challenge-platform|cloudflare/i.test(url)) return false
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    const path = u.pathname.toLowerCase()
    if (host.includes('cinflix.xyz')) return isCinflixApiUrl(url)
    return path.includes('.mp4') || path.includes('.m3u8') || host.includes('blink-n3')
  } catch {
    return false
  }
}
