'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

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

function SplashScreen() {
  return (
    <AnimatePresence>
      <motion.div
        key="splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-8"
        >
          <Image
            src="/images/logo.png"
            alt="StreamSelf"
            width={280}
            height={80}
            className="object-contain"
            priority
          />
        </motion.div>

        {/* Spinner arc rouge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <svg
            className="animate-spin"
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="18"
              cy="18"
              r="15"
              stroke="#e50914"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="50 94"
            />
          </svg>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

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
      <AnimatePresence>
        {loading && <SplashScreen key="splash" />}
      </AnimatePresence>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}