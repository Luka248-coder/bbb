'use client'

import { useEffect } from 'react'

export function CinflixSwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw-cinflix.js?v=7', { scope: '/', updateViaCache: 'none' }).catch(() => {})
  }, [])
  return null
}
