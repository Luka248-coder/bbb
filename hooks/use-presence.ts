'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function getSessionId() {
  if (typeof window === 'undefined') return null
  let sid = localStorage.getItem('_sid')
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('_sid', sid)
  }
  return sid
}

export function usePresence(userId?: string | null) {
  const pathname = usePathname()

  useEffect(() => {
    const sid = getSessionId()
    if (!sid) return

    const getPage = (path: string) => {
      if (path.startsWith('/watch/movie')) return 'watch_movie'
      if (path.startsWith('/watch/series')) return 'watch_series'
      return 'home'
    }

    const ping = () => {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId || sid, page: getPage(pathname) }),
      }).catch(() => {})
    }

    ping()
    const interval = setInterval(ping, 30 * 1000)
    return () => clearInterval(interval)
  }, [userId, pathname])
}
