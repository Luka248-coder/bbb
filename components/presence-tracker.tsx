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

export function PresenceTracker({ page }: { page?: string }) {
  const pathname = usePathname()

  useEffect(() => {
    const sid = getSessionId()
    if (!sid) return

    const currentPage = page || (
      pathname.startsWith('/watch/movie') ? 'watch_movie' :
      pathname.startsWith('/watch/series') ? 'watch_series' :
      'home'
    )

    const ping = () => {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: sid, page: currentPage }),
      }).catch(() => {})
    }

    ping()
    const interval = setInterval(ping, 30 * 1000)
    return () => clearInterval(interval)
  }, [pathname, page])

  return null
}
