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
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #2a0a0a 0%, #0d0205 60%, #000000 100%)' }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <Image
            src="/images/logo.png"
            alt="StreamSelf"
            width={90}
            height={90}
            className="object-contain"
            priority
          />
        </motion.div>

        {/* Trait dégradé bleu */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ originX: 0, width: '260px' }}
        >
          <div
            style={{
              height: '1.5px',
              background: 'linear-gradient(90deg, transparent 0%, #1d6fe8 30%, #60a5fa 65%, transparent 100%)',
              boxShadow: '0 0 12px rgba(29, 111, 232, 0.7), 0 0 28px rgba(29, 111, 232, 0.3)',
            }}
          />
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