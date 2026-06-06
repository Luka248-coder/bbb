'use client'

import { useEffect } from 'react'

export function PresenceTracker({ page }: { page: string }) {
  useEffect(() => {
    const ping = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' })
        const sessionData = await sessionRes.json()
        const userId = sessionData?.user?.id
        if (!userId) return

        await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, page }),
        })
      } catch {}
    }

    ping()
    const interval = setInterval(ping, 60 * 1000)
    return () => clearInterval(interval)
  }, [page])

  return null
}
