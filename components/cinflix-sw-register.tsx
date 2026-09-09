'use client'

import { useEffect } from 'react'

function probe(apiUrl: string) {
  const url = new URL(apiUrl)
  url.searchParams.set('_', String(Date.now()))
  const img = document.createElement('img')
  img.referrerPolicy = 'no-referrer'
  img.src = url.toString()
  window.setTimeout(() => {
    img.src = ''
  }, 8000)
}

export function CinflixSwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw-cinflix.js?v=13', { scope: '/', updateViaCache: 'none' }).catch(() => {})
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
