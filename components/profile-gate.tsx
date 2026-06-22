'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

const EXEMPT_PATHS = ['/profiles', '/login', '/auth', '/api', '/admin', '/embed', '/watch']

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { activeProfile, loadProfiles, initialized } = useProfile()
  const pathname = usePathname()
  const router = useRouter()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const isExempt = EXEMPT_PATHS.some(p => pathname.startsWith(p))

  // Vérifier la session une seule fois
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(async session => {
        if (session?.user) {
          setIsLoggedIn(true)
          await loadProfiles()
        }
        setSessionChecked(true)
      })
      .catch(() => setSessionChecked(true))
  }, [])

  // Rediriger vers /profiles si connecté sans profil actif
  useEffect(() => {
    if (!initialized || !sessionChecked || isExempt) return
    if (!isLoggedIn) return
    if (!activeProfile) {
      router.replace('/profiles')
    }
  }, [initialized, sessionChecked, isLoggedIn, activeProfile, isExempt])

  // Bloquer le rendu tant qu'on n'a pas vérifié
  const stillChecking = !initialized || !sessionChecked
  const needsRedirect = initialized && sessionChecked && isLoggedIn && !activeProfile && !isExempt

  if (stillChecking || needsRedirect) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTopColor: 'rgba(255,255,255,0.4)',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return <>{children}</>
}
