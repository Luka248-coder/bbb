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

function watchInfo(pathname: string) {
  const m = pathname.match(/^\/watch\/(movie|series)\/(\d+)/)
  if (!m) return { page: pathname.startsWith('/admin') ? 'admin' : 'home' as const }
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  return {
    page: m[1] === 'movie' ? 'watch_movie' : 'watch_series',
    content_type: m[1] as 'movie' | 'series',
    tmdb_id: Number(m[2]),
    season: params?.get('season') ? Number(params.get('season')) : undefined,
    episode: params?.get('episode') ? Number(params.get('episode')) : undefined,
  }
}

export function usePresence(userId?: string | null, username?: string | null) {
  const pathname = usePathname()

  useEffect(() => {
    const sid = getSessionId()
    if (!sid) return

    const ping = () => {
      const info = watchInfo(pathname)
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId || sid,
          username: username || null,
          ...info,
        }),
      }).catch(() => {})
    }

    ping()
    const interval = setInterval(ping, 25 * 1000)
    return () => clearInterval(interval)
  }, [userId, username, pathname])
}
