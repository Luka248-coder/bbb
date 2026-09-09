'use client'

import { useEffect } from 'react'

function probe(apiUrl: string) {
  const url = new URL(apiUrl)
  url.searchParams.set('_', String(Date.now()))
  const href = url.toString()
  const img = new Image()
  img.referrerPolicy = 'no-referrer'
  img.src = href
  fetch(href, {
    mode: 'no-cors',
    redirect: 'follow',
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  }).catch(() => {})
  window.setTimeout(() => { img.src = '' }, 3000)
}

export function CinflixSwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw-cinflix.js?v=12', { scope: '/', updateViaCache: 'none' }).catch(() => {})
    const onMsg = (event: MessageEvent) => {
      if (event.data?.type === 'CINFLIX_PROBE' && typeof event.data.url === 'string') {
        probe(event.data.url)
      }
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [])
  return null
}
