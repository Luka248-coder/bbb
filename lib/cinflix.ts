import { cinflixStreamApiUrl, isCinflixApiUrl, isPlayableMediaUrl } from '@/lib/cinflix-url'

export { cinflixStreamApiUrl, isCinflixApiUrl, isCinflixMediaUrl, isPlayableMediaUrl } from '@/lib/cinflix-url'

const CINFLIX_ORIGIN = 'https://cinflix.xyz'
const CINFLIX_REFERER = `${CINFLIX_ORIGIN}/`
const TIMEOUT_MS = 2500

const USER_AGENTS = [
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36',
]

function pickUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  return isPlayableMediaUrl(trimmed) ? trimmed : null
}

function isBlinkMedia(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('blink-n3') || /\.mp4(?:$|\?)/i.test(url)
  } catch {
    return false
  }
}

function headerLocation(raw: string | null, base: string): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw.trim(), base)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    const href = u.toString()
    if (isCinflixApiUrl(href)) return null
    return isBlinkMedia(href) || /\.mp4(?:$|\?)/i.test(href) ? href : href
  } catch {
    return null
  }
}

function acceptIfMedia(url: string | null): string | null {
  if (!url || isCinflixApiUrl(url)) return null
  return isBlinkMedia(url) ? url : null
}

function urlFromPayload(data: any): string | null {
  if (!data || typeof data !== 'object') return null
  return (
    pickUrl(data.url) ||
    pickUrl(data.stream) ||
    pickUrl(data.src) ||
    pickUrl(data.file) ||
    pickUrl(data.videoUrl) ||
    pickUrl(data.video_url) ||
    pickUrl(data.data?.url) ||
    pickUrl(data.data?.stream) ||
    null
  )
}

function headersFor(ua: string): Record<string, string> {
  return {
    Accept: '*/*',
    'Accept-Language': 'fr-FR,fr;q=0.9',
    'User-Agent': ua,
    Referer: CINFLIX_REFERER,
  }
}

async function tryResolve(apiUrl: string, ua: string): Promise<string | null> {
  const headers = headersFor(ua)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const manual = await fetch(apiUrl, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers,
      signal: ctrl.signal,
    })
    const loc = acceptIfMedia(headerLocation(manual.headers.get('location'), apiUrl))
    if (loc) {
      try { await manual.body?.cancel() } catch {}
      return loc
    }
    const contentType = manual.headers.get('content-type') || ''
    if (contentType.includes('json')) {
      const text = (await manual.text()).slice(0, 64 * 1024)
      try {
        const fromJson = urlFromPayload(JSON.parse(text))
        if (fromJson) return fromJson
      } catch {}
    } else {
      try { await manual.body?.cancel() } catch {}
    }

    const followed = await fetch(apiUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      headers,
      signal: ctrl.signal,
    })
    const finalUrl = acceptIfMedia(followed.url)
    try { await followed.body?.cancel() } catch {}
    if (finalUrl) return finalUrl
  } catch {
  } finally {
    clearTimeout(timer)
  }
  return null
}

export async function resolveCinflixApiUrl(apiUrl: string): Promise<string | null> {
  for (const ua of USER_AGENTS) {
    const url = await tryResolve(apiUrl, ua)
    if (url) return url
  }
  return null
}

export async function getCinflixStreamUrl(
  type: 'movie' | 'series' | 'tv',
  tmdbId: number,
  season = 1,
  episode = 1,
): Promise<string | null> {
  if (!tmdbId) return null

  const kind = type === 'movie' ? 'movie' : 'tv'
  const apiUrl = cinflixStreamApiUrl(kind, tmdbId, season, episode)

  try {
    const media = await resolveCinflixApiUrl(apiUrl)
    if (media) {
      console.log(`[Cinflix] ✅ ${kind} ${tmdbId} → ${media.slice(0, 80)}`)
      return media
    }
    console.warn(`[Cinflix] ${kind} ${tmdbId} unresolved`)
  } catch (err) {
    console.error('[Cinflix]', err)
  }

  return null
}
