import https from 'node:https'
import { URL } from 'node:url'

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

export function isCinflixMediaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('cinflix') || host.includes('blink-n3')
  } catch {
    return false
  }
}

function pickUrl(value: unknown, base?: string): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const absolute = new URL(trimmed, base || CINFLIX_ORIGIN).toString()
    if (!/^https?:\/\//i.test(absolute)) return null
    if (absolute.includes('cinflix.xyz/api/')) return null
    return absolute
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

function requestNoRedirect(urlStr: string): Promise<CinflixResponse> {
  return new Promise(resolve => {
    const empty: CinflixResponse = { status: 0, location: null, contentType: '', text: '' }
    let settled = false
    const done = (value: CinflixResponse) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    try {
      const u = new URL(urlStr)
      const req = https.request(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || 443,
          path: `${u.pathname}${u.search}`,
          method: 'GET',
          headers: HEADERS,
          timeout: TIMEOUT_MS,
        },
        res => {
          const location = pickUrl(res.headers.location || '', urlStr)
          const contentType = String(res.headers['content-type'] || '')
          const status = res.statusCode || 0

          if (status >= 300 && status < 400) {
            res.resume()
            done({ status, location, contentType, text: '' })
            return
          }

          const chunks: Buffer[] = []
          let size = 0
          res.on('data', chunk => {
            size += chunk.length
            if (size <= 64 * 1024) chunks.push(chunk)
            else res.destroy()
          })
          res.on('end', () => {
            done({
              status,
              location,
              contentType,
              text: Buffer.concat(chunks).toString('utf8'),
            })
          })
          res.on('error', () => done({ status, location, contentType, text: '' }))
        },
      )

      req.on('timeout', () => {
        req.destroy()
        done(empty)
      })
      req.on('error', () => done(empty))
      req.end()
    } catch {
      done(empty)
    }
  })
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
    const res = await requestNoRedirect(apiUrl)
    if (res.location) {
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

    const fromText = pickUrl(res.text)
    if (fromText) return fromText

    if (!res.status) console.warn(`[Cinflix] ${kind} ${tmdbId} timeout/error`)
    else console.warn(`[Cinflix] ${kind} ${tmdbId} → ${res.status}`)
  } catch (err) {
    console.error('[Cinflix]', err)
  }

  return null
}
