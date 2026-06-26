'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface User {
  id: string
  discord_id: string
  username: string
  avatar: string | null
  email: string | null
  is_admin: boolean
  role?: 'user' | 'staff' | 'admin'
  is_disabled?: boolean
  disabled_reason?: string | null
}

interface SessionContextType {
  user: User | null
  loading: boolean
  refresh: () => void
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  refresh: () => {},
})

const PUBLIC_PATHS = ['/login']

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' })
      const data = await res.json()
      const u = data.user || null

      if (u?.is_disabled && !PUBLIC_PATHS.includes(pathname)) {
        const reason = encodeURIComponent(u.disabled_reason || 'Compte désactivé temporairement.')
        router.replace(`/disabled?reason=${reason}`)
        setUser(null)
        setLoading(false)
        return
      }

      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [])

  return (
    <SessionContext.Provider value={{ user, loading, refresh: fetchSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}