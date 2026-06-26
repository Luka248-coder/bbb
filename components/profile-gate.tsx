'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

const EXEMPT_PATHS = ['/profiles', '/login', '/auth', '/api', '/admin', '/embed', '/watch']

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { activeProfile, loadProfiles, initialized } = useProfile()
  const pathname = usePathname()
  const router = useRouter()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const minDelayRef = useRef(false)

  const isExempt = EXEMPT_PATHS.some(p => pathname.startsWith(p))

  // Déterminer côté client si c'est le premier chargement
  useEffect(() => {
    const already = sessionStorage.getItem('app_loaded')
    if (!already) {
      sessionStorage.setItem('app_loaded', '1')
      setShowSplash(true)
      setTimeout(() => { minDelayRef.current = true }, 2500)
    }
  }, [])

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

  // Masquer le splash quand tout est prêt + délai minimum écoulé
  useEffect(() => {
    if (!showSplash) return
    if (!initialized || !sessionChecked) return

    const tryHide = () => {
      if (minDelayRef.current) {
        setShowSplash(false)
      } else {
        setTimeout(tryHide, 100)
      }
    }
    tryHide()
  }, [showSplash, initialized, sessionChecked])

  // Rediriger vers /profiles si connecté sans profil actif
  useEffect(() => {
    if (!initialized || !sessionChecked || isExempt) return
    if (!isLoggedIn) return
    if (pathname === '/') return
    if (!activeProfile) {
      router.replace('/profiles')
    }
  }, [initialized, sessionChecked, isLoggedIn, activeProfile, isExempt, pathname])

  const needsRedirect = initialized && sessionChecked && isLoggedIn && !activeProfile && !isExempt && pathname !== '/'

  if (showSplash) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(ellipse at center, #2a0a0a 0%, #0d0205 60%, #000000 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="/images/logo.png"
            alt="Logo"
            style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 20,
              animation: 'fadeInScale 0.6s cubic-bezier(0.22,1,0.36,1) forwards' }}
          />
          <div style={{ width: 260, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{
              height: '1.5px',
              background: 'linear-gradient(90deg, transparent 0%, #1d6fe8 30%, #60a5fa 65%, transparent 100%)',
              boxShadow: '0 0 12px rgba(29,111,232,0.7), 0 0 28px rgba(29,111,232,0.3)',
              animation: 'slideIn 0.9s 0.35s cubic-bezier(0.22,1,0.36,1) both',
              transformOrigin: 'left',
            }} />
          </div>
          <p style={{
            width: 260, letterSpacing: '0.22em', fontSize: 12, fontFamily: 'sans-serif',
            display: 'flex', justifyContent: 'space-between',
            animation: 'fadeInUp 0.7s 0.9s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            <span style={{ color: 'rgba(200,180,180,0.55)', fontWeight: 700 }}>LE CINÉMA</span>
            <span style={{ color: '#1d6fe8', fontWeight: 700 }}>POUR TOUS</span>
          </p>
        </div>
        <style>{`
          @keyframes fadeInScale { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
          @keyframes slideIn { from{transform:scaleX(0);opacity:0} to{transform:scaleX(1);opacity:1} }
          @keyframes fadeInUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </div>
    )
  }

  if (needsRedirect) return null

  return <>{children}</>
}
