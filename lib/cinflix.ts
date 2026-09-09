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

function looksLikeMedia(url: string, contentType = ''): boolean {
  const c = contentType.toLowerCase()
  const u = url.toLowerCase()
  return (
    c.includes('video') ||
    c.includes('mpegurl') ||
    u.includes('.mp4') ||
    u.includes('.m3u8')
  )
}

async function cancelBody(res: Response) {
  try {
    await res.body?.cancel()
  } catch {}
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

  const apiUrl = `${CINFLIX_ORIGIN}/api/media/stream?${params}`

  try {
    const res = await fetch(apiUrl, {
      headers: HEADERS,
      redirect: 'follow',
      cache: 'no-store',
    })

    const redirected = pickUrl(res.headers.get('location') || '')
    if (redirected) {
      await cancelBody(res)
      console.log(`[Cinflix] ✅ ${kind} ${tmdbId} location → ${redirected.slice(0, 80)}`)
      return redirected
    }

    const finalUrl = pickUrl(res.url)
    const contentType = res.headers.get('content-type') || ''
    if (finalUrl && looksLikeMedia(finalUrl, contentType)) {
      await cancelBody(res)
      console.log(`[Cinflix] ✅ ${kind} ${tmdbId} → ${finalUrl.slice(0, 80)}`)
      return finalUrl
    }

    if (!res.ok) {
      await cancelBody(res)
      console.warn(`[Cinflix] ${kind} ${tmdbId} → ${res.status}`)
      return null
    }

    if (contentType.includes('json')) {
      const json = await res.json().catch(() => null)
      const fromJson = urlFromPayload(json)
      if (fromJson) {
        console.log(`[Cinflix] ✅ ${kind} ${tmdbId} json → ${fromJson.slice(0, 80)}`)
        return fromJson
      }
    } else if (!contentType.includes('video') && !contentType.includes('mpegurl')) {
      const text = (await res.text()).trim()
      const fromText = pickUrl(text)
      if (fromText) return fromText
    } else {
      await cancelBody(res)
    }
  } catch (err) {
    console.error('[Cinflix]', err)
  }

  return null
}
