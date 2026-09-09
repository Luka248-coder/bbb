self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

function isBlink(requestUrl) {
  try {
    return new URL(requestUrl).hostname.toLowerCase().includes('blink-n3')
  } catch {
    return false
  }
}

async function tellClients(blinkUrl) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of list) {
    client.postMessage({ type: 'cinflix-blink', url: blinkUrl })
  }
}

self.addEventListener('fetch', event => {
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

  // JS probe: capture the redirected URL, do not let Chrome hit blink with Referer streamself.
  event.respondWith(new Response('', { status: 204 }))
})
