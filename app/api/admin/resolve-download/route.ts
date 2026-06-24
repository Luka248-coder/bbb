import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const DOWNLOAD_API = 'https://amorphous-stream-flux-hub.base44.app/api'
const BASE44_WAIT_MS = 1300

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function normalizePart(value: string | number | undefined, fallback: number): string {
  const parsed = parseInt(String(value ?? fallback).replace(/\D/g, '') || String(fallback), 10)
  return String(parsed).padStart(2, '0')
}

function isUnavailable(value: unknown): boolean {
  return (
    !value ||
    (typeof value === 'string' && value.toLowerCase().includes('indisponible'))
  )
}

function extractDownloadUrl(text: string): string | null {
  const trimmed = text.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const matches = trimmed.match(/https?:\/\/[^\s"'<>]+/gi) || []
  return matches.find(url => {
    const lowerUrl = url.toLowerCase()
    return lowerUrl.includes('.mp4') || lowerUrl.includes('/api/stream') || lowerUrl.includes('download=1')
  }) || null
}

async function getExecutablePath(chromium: any): Promise<string | undefined> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH

  try {
    return await chromium.executablePath()
  } catch {
    return undefined
  }
}

async function resolveFromBase44(apiUrl: string): Promise<string | null> {
  const chromium = await import('@sparticuz/chromium')
  const puppeteer = await import('puppeteer-core')

  const browser = await puppeteer.default.launch({
    args: chromium.default.args,
    defaultViewport: chromium.default.defaultViewport,
    executablePath: await getExecutablePath(chromium.default),
    headless: chromium.default.headless,
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    )

    await page.goto(apiUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await sleep(BASE44_WAIT_MS)

    let text = await page.evaluate(() => document.body?.innerText || '')
    let downloadUrl = extractDownloadUrl(text)

    if (!downloadUrl) {
      await page.waitForFunction(
        () => document.body?.innerText?.includes('http'),
        { timeout: 5000 }
      ).catch(() => null)
      text = await page.evaluate(() => document.body?.innerText || '')
      downloadUrl = extractDownloadUrl(text)
    }

    return downloadUrl
  } finally {
    await browser.close()
  }
}

export async function POST(request: NextRequest) {
  const { tmdbId, type, season, episode, url } = await request.json()

  if (url) {
    const downloadUrl = extractDownloadUrl(String(url))
    if (isUnavailable(downloadUrl)) {
      return NextResponse.json({ available: false })
    }

    return NextResponse.json({ available: true, url: downloadUrl })
  }

  if (!tmdbId || !type) {
    return NextResponse.json({ error: 'tmdbId et type requis' }, { status: 400 })
  }

  try {
    let apiUrl: string

    if (type === 'movie') {
      apiUrl = `${DOWNLOAD_API}/movie/${tmdbId}/`
    } else {
      const s = normalizePart(season, 1)
      const e = normalizePart(episode, 1)
      apiUrl = `${DOWNLOAD_API}/serie/${tmdbId}/S${s}/E${e}/`
    }

    const downloadUrl = await resolveFromBase44(apiUrl)

    if (isUnavailable(downloadUrl)) {
      return NextResponse.json({ available: false })
    }

    return NextResponse.json({ available: true, url: downloadUrl })
  } catch (err: any) {
    console.error('[resolve-download]', err)
    return NextResponse.json({ available: false, error: err.message }, { status: 502 })
  }
}
