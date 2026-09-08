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

export function PresenceTracker({
  page,
  title,
  tmdbId,
  contentType,
  poster,
  season,
  episode,
  username,
  userId,
}: {
  page?: string
  title?: string
  tmdbId?: number
  contentType?: 'movie' | 'series'
  poster?: string | null
  season?: number
  episode?: number
  username?: string | null
  userId?: string | null
}) {
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
        body: JSON.stringify({
          user_id: userId || sid,
          username: username || null,
          page: currentPage,
          content_type: contentType || (currentPage === 'watch_movie' ? 'movie' : currentPage === 'watch_series' ? 'series' : null),
          tmdb_id: tmdbId || null,
          title: title || null,
          poster: poster || null,
          season: season || null,
          episode: episode || null,
        }),
      }).catch(() => {})
    }

    ping()
    const interval = setInterval(ping, 25 * 1000)
    return () => clearInterval(interval)
  }, [pathname, page, title, tmdbId, contentType, poster, season, episode, username, userId])

  return null
}
