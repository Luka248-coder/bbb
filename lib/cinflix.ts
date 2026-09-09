import { cinflixStreamApiUrl, isCinflixApiUrl, isPlayableMediaUrl } from '@/lib/cinflix-url'

export { cinflixStreamApiUrl, isCinflixApiUrl, isCinflixMediaUrl, isPlayableMediaUrl } from '@/lib/cinflix-url'

const CINFLIX_ORIGIN = 'https://cinflix.xyz'
const CINFLIX_REFERER = `${CINFLIX_ORIGIN}/`
const TIMEOUT_MS = 8000

const HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: CINFLIX_REFERER,
  Origin: CINFLIX_ORIGIN,
}

function pickUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  return isPlayableMediaUrl(trimmed) ? trimmed : null
}

function headerLocation(raw: string | null, base: string): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw.trim(), base)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (isCinflixApiUrl(u.toString())) return null
    return u.toString()
  } catch {
    return null
  }
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

async function requestNoRedirect(urlStr: string): Promise<{
  status: number
  location: string | null
  contentType: string
  text: string
}> {
  const empty = { status: 0, location: null, contentType: '', text: '' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(urlStr, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: HEADERS,
      signal: ctrl.signal,
    })
    const location = headerLocation(res.headers.get('location'), urlStr)
    const contentType = res.headers.get('content-type') || ''
    const status = res.status || 0

    if ((status >= 300 && status < 400) || contentType.includes('text/html') || contentType.includes('video/')) {
      try { await res.body?.cancel() } catch {}
      return { status, location, contentType, text: '' }
    }

    const text = contentType.includes('json') ? (await res.text()).slice(0, 64 * 1024) : ''
    if (!contentType.includes('json')) {
      try { await res.body?.cancel() } catch {}
    }
    return { status, location, contentType, text }
  } catch {
    return empty
  } finally {
    clearTimeout(timer)
  }
}

function isBlinkMedia(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('blink-n3') || /\.mp4(?:$|\?)/i.test(url)
  } catch {
    return false
  }
}

export async function resolveCinflixApiUrl(apiUrl: string): Promise<string | null> {
  const res = await requestNoRedirect(apiUrl)
  if (res.location && !isCinflixApiUrl(res.location)) return res.location
  if (res.contentType.includes('json') && res.text) {
    try {
      const fromJson = urlFromPayload(JSON.parse(res.text))
      if (fromJson) return fromJson
    } catch {}
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const followed = await fetch(apiUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      headers: HEADERS,
      signal: ctrl.signal,
    })
    const finalUrl = followed.url
    try { await followed.body?.cancel() } catch {}
    if (finalUrl && !isCinflixApiUrl(finalUrl) && isBlinkMedia(finalUrl)) return finalUrl
  } catch {
  } finally {
    clearTimeout(timer)
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
