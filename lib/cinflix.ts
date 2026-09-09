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

function absHttpUrl(value: string | null, base: string): string | null {
  if (!value) return null
  try {
    const u = new URL(value.trim(), base)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (/[<>]|DOCTYPE|Just a moment|challenge-platform/i.test(u.toString())) return null
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

type CinflixResponse = {
  status: number
  location: string | null
  contentType: string
  text: string
}

async function requestNoRedirect(urlStr: string): Promise<CinflixResponse> {
  const empty: CinflixResponse = { status: 0, location: null, contentType: '', text: '' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(urlStr, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      signal: ctrl.signal,
      headers: HEADERS,
    })

    const location = absHttpUrl(res.headers.get('location'), urlStr)
    const contentType = String(res.headers.get('content-type') || '')

    if (location || res.status >= 300) {
      try { await res.body?.cancel() } catch {}
      return { status: res.status, location, contentType, text: '' }
    }

    if (contentType.includes('text/html')) {
      try { await res.body?.cancel() } catch {}
      return { status: res.status, location: null, contentType, text: '' }
    }

    const text = contentType.includes('json') ? await res.text() : ''
    if (!text) {
      try { await res.body?.cancel() } catch {}
    }

    return { status: res.status, location, contentType, text }
  } catch {
    return empty
  } finally {
    clearTimeout(timer)
  }
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
    const res = await requestNoRedirect(apiUrl)
    if (res.location && !isCinflixApiUrl(res.location)) {
      console.log(`[Cinflix] ✅ ${kind} ${tmdbId} → ${res.location.slice(0, 80)}`)
      return res.location
    }

    if (res.contentType.includes('json') && res.text) {
      const json = JSON.parse(res.text)
      const fromJson = urlFromPayload(json)
      if (fromJson) {
        console.log(`[Cinflix] ✅ ${kind} ${tmdbId} json → ${fromJson.slice(0, 80)}`)
        return fromJson
      }
    }

    if (res.contentType.includes('text/html') || !res.status) {
      console.warn(`[Cinflix] ${kind} ${tmdbId} blocked — returning API URL for proxy resolve`)
      return apiUrl
    }

    console.warn(`[Cinflix] ${kind} ${tmdbId} → ${res.status}`)
  } catch (err) {
    console.error('[Cinflix]', err)
  }

  return apiUrl
}
