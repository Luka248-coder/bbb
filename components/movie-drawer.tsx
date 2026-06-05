'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { PlayerPage } from '@/components/player-page'

// ─── Context ───────────────────────────────────────────────────────────────

interface DrawerState {
  open: boolean
  type: 'movie' | 'series'
  tmdbId: number
}

interface DrawerContextValue {
  openDrawer: (type: 'movie' | 'series', tmdbId: number) => void
  closeDrawer: () => void
}

const DrawerContext = createContext<DrawerContextValue>({
  openDrawer: () => {},
  closeDrawer: () => {},
})

export function useDrawer() {
  return useContext(DrawerContext)
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function MovieDrawerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DrawerState>({ open: false, type: 'movie', tmdbId: 0 })
  const [userId, setUserId] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setUserId(d?.user?.id || null)).catch(() => {})
  }, [])

  const openDrawer = useCallback((type: 'movie' | 'series', tmdbId: number) => {
    setState({ open: true, type, tmdbId })
    document.body.style.overflow = 'hidden'
  }, [])

  const closeDrawer = useCallback(() => {
    setState(s => ({ ...s, open: false }))
    document.body.style.overflow = ''
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeDrawer])

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}

      <AnimatePresence>
        {state.open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[98]"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
              onClick={closeDrawer}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ y: '100%', borderRadius: '24px' }}
              animate={{ y: '4vh', borderRadius: '24px' }}
              exit={{ y: '100%', borderRadius: '24px' }}
              transition={{ type: 'spring', stiffness: 320, damping: 38, mass: 0.8 }}
              className="fixed bottom-0 z-[99] overflow-hidden"
              style={{
                left: '3vw',
                right: '3vw',
                height: '94vh',
                background: 'rgb(10,10,12)',
                boxShadow: '0 -24px 80px rgba(0,0,0,0.8)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-10 h-1 rounded-full bg-white/20" />

              {/* Close button */}
              <button
                onClick={closeDrawer}
                className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)' }}
              >
                <X className="w-4 h-4 text-white" />
              </button>

              {/* Scrollable content */}
              <div className="h-full overflow-y-auto overflow-x-hidden">
                <PlayerPage
                  key={`${state.type}-${state.tmdbId}`}
                  type={state.type}
                  tmdbId={state.tmdbId}
                  playerUrl=""
                  initialSeason={1}
                  initialEpisode={1}
                  userId={userId}
                  isDrawer
                  onClose={closeDrawer}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DrawerContext.Provider>
  )
}
