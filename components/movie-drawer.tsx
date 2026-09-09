'use client'

import { createContext, useContext, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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

export function titlePath(type: 'movie' | 'series', tmdbId: number, extra?: Record<string, string | number>) {
  const qs = extra
    ? '?' + new URLSearchParams(
        Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])),
      ).toString()
    : ''
  return `/title/${type}/${tmdbId}${qs}`
}

export function MovieDrawerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const openDrawer = useCallback((type: 'movie' | 'series', tmdbId: number) => {
    router.push(titlePath(type, tmdbId))
  }, [router])

  const closeDrawer = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }, [router])

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}
    </DrawerContext.Provider>
  )
}
