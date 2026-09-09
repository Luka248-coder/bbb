const CINFLIX_ORIGIN = 'https://cinflix.xyz'
const CINFLIX_REFERER = `${CINFLIX_ORIGIN}/`

const HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: CINFLIX_REFERER,
  Origin: CINFLIX_ORIGIN,
}

export function isCinflixMediaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('cinflix') || host.includes('blink-n3')
  } catch {
    return false
  }
}

function pickUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  if (trimmed.includes('cinflix.xyz/api/')) return null
  return trimmed
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

export async function getCinflixStreamUrl(
  type: 'movie' | 'series' | 'tv',
  tmdbId: number,
  season = 1,
  episode = 1,
): Promise<string | null> {
  if (!tmdbId) return null

  const kind = type === 'movie' ? 'movie' : 'tv'
  const params = new URLSearchParams({ type: kind, id: String(tmdbId) })
  if (kind === 'tv') {
    params.set('s', String(season || 1))
    params.set('e', String(episode || 1))
  }

  try {
    const res = await fetch(`${CINFLIX_ORIGIN}/api/media/stream?${params}`, {
      headers: HEADERS,
      redirect: 'manual',
      cache: 'no-store',
    })

    const location = pickUrl(res.headers.get('location') || '')
    if (location) {
      console.log(`[Cinflix] ✅ ${kind} ${tmdbId} → ${location.slice(0, 80)}`)
      return location
    }

    if (!res.ok) {
      console.warn(`[Cinflix] ${kind} ${tmdbId} → ${res.status}`)
      return null
    }

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('json')) {
      const json = await res.json().catch(() => null)
      const fromJson = urlFromPayload(json)
      if (fromJson) {
        console.log(`[Cinflix] ✅ ${kind} ${tmdbId} json → ${fromJson.slice(0, 80)}`)
        return fromJson
      }
    } else {
      const text = (await res.text()).trim()
      const fromText = pickUrl(text)
      if (fromText) return fromText
    }
  } catch (err) {
    console.error('[Cinflix]', err)
  }

  return null
}
