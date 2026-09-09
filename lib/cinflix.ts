import https from 'node:https'
import dns from 'node:dns'
import { URL } from 'node:url'
import { cinflixStreamApiUrl, isCinflixApiUrl, isPlayableMediaUrl } from '@/lib/cinflix-url'

export { cinflixStreamApiUrl, isCinflixApiUrl, isCinflixMediaUrl, isPlayableMediaUrl } from '@/lib/cinflix-url'

try { dns.setDefaultResultOrder('ipv4first') } catch {}

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

function headerLocation(raw: string | string[] | undefined, base: string): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return null
  try {
    const u = new URL(String(value).trim(), base)
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
          family: 4,
        },
        res => {
          const location = headerLocation(res.headers.location, urlStr)
          const contentType = String(res.headers['content-type'] || '')
          const status = res.statusCode || 0

          if (status >= 300 && status < 400) {
            res.resume()
            done({ status, location, contentType, text: '' })
            return
          }

          if (contentType.includes('text/html') || contentType.includes('video/')) {
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

export async function resolveCinflixApiUrl(apiUrl: string): Promise<string | null> {
  const res = await requestNoRedirect(apiUrl)
  if (res.location) return res.location
  if (res.contentType.includes('json') && res.text) {
    try {
      return urlFromPayload(JSON.parse(res.text))
    } catch {}
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
    console.warn(`[Cinflix] ${kind} ${tmdbId} unresolved — API URL for proxy`)
  } catch (err) {
    console.error('[Cinflix]', err)
  }

  return apiUrl
}
