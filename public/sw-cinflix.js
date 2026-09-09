self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

const waiters = []

function isBlink(requestUrl) {
  try {
    return new URL(requestUrl).hostname.toLowerCase().includes('blink-n3')
  } catch {
    return false
  }
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function emptyHtml() {
  return new Response('<!doctype html><title></title>', {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function cinflixApiFromResolve(requestUrl) {
  const u = new URL(requestUrl)
  const type = u.searchParams.get('type') === 'tv' || u.searchParams.get('type') === 'series' ? 'tv' : 'movie'
  const id = u.searchParams.get('id') || ''
  const params = new URLSearchParams({ type, id })
  const season = u.searchParams.get('s')
  const episode = u.searchParams.get('e')
  if (type === 'tv') {
    params.set('s', season || '1')
    params.set('e', episode || '1')
  }
  return 'https://cinflix.xyz/api/media/stream?' + params.toString()
}

function waitBlink(ms) {
  return new Promise(resolve => {
    const entry = {
      resolve,
      t: setTimeout(() => {
        const i = waiters.indexOf(entry)
        if (i >= 0) waiters.splice(i, 1)
        resolve(null)
      }, ms),
    }
    waiters.push(entry)
  })
}

async function tellClients(blinkUrl) {
  while (waiters.length) {
    const w = waiters.pop()
    clearTimeout(w.t)
    w.resolve(blinkUrl)
  }
  try {
    const ch = new BroadcastChannel('cinflix-blink')
    ch.postMessage({ type: 'cinflix-blink', url: blinkUrl })
    ch.close()
  } catch {}
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of list) {
    client.postMessage({ type: 'cinflix-blink', url: blinkUrl })
  }
}

async function handleCinflixResolve(event) {
  const cinflixUrl = cinflixApiFromResolve(event.request.url)
  const pending = waitBlink(8000)
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of list) {
    client.postMessage({ type: 'CINFLIX_PROBE', url: cinflixUrl })
  }
  const blink = await pending
  return jsonResponse({ url: blink })
}

self.addEventListener('fetch', event => {
  let parsed
  try {
    parsed = new URL(event.request.url)
  } catch {
    return
  }

  if (parsed.origin === self.location.origin && parsed.pathname === '/api/cinflix-resolve') {
    if (parsed.searchParams.has('direct')) return
    event.respondWith(handleCinflixResolve(event))
    return
  }

  if (!isBlink(event.request.url)) return

  event.waitUntil(tellClients(event.request.url))

  const dest = event.request.destination
  if (dest === 'video' || dest === 'audio' || dest === 'media') {
    const proxy = new URL('/api/proxy-download', self.location.origin)
    proxy.searchParams.set('url', event.request.url)
    const headers = new Headers()
    const range = event.request.headers.get('Range')
    if (range) headers.set('Range', range)
    event.respondWith(fetch(proxy.toString(), { headers, redirect: 'follow' }))
    return
  }

  event.respondWith(emptyHtml())
})
