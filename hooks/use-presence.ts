'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function usePresence(userId: string | null | undefined) {
  const pathname = usePathname()

  useEffect(() => {
    if (!userId) return

    const getPage = (path: string) => {
      if (path.startsWith('/watch/movie')) return 'watch_movie'
      if (path.startsWith('/watch/series')) return 'watch_series'
      return 'home'
    }

    const ping = () => {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, page: getPage(pathname) }),
      }).catch(() => {})
    }

    ping()
    const interval = setInterval(ping, 60 * 1000)
    return () => clearInterval(interval)
  }, [userId, pathname])
}
