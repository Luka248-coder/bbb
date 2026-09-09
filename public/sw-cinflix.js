self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', event => {
  let url
  try {
    url = new URL(event.request.url)
  } catch {
    return
  }
  if (!url.hostname.includes('blink-n3')) return

  const proxy = new URL('/api/proxy-download', self.location.origin)
  proxy.searchParams.set('url', event.request.url)
  const headers = new Headers()
  const range = event.request.headers.get('Range')
  if (range) headers.set('Range', range)

  event.respondWith(fetch(proxy.toString(), { headers }))
})
