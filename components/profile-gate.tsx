'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

// Pages qui ne nécessitent pas de profil sélectionné
const EXEMPT_PATHS = ['/profiles', '/login', '/api', '/admin', '/embed']

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { activeProfile, loadProfiles, profiles } = useProfile()
  const pathname = usePathname()
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    fetch('/api/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(async (session) => {
        if (session?.user) {
          setLoggedIn(true)
          await loadProfiles()
        }
        setChecked(true)
      })
      .catch(() => setChecked(true))
  }, [])

  useEffect(() => {
    if (!checked) return
    if (!loggedIn) return
    if (EXEMPT_PATHS.some(p => pathname.startsWith(p))) return
    if (!activeProfile) {
      router.replace('/profiles')
    }
  }, [checked, loggedIn, activeProfile, pathname])

  return <>{children}</>
}
