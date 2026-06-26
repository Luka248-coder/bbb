'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

const EXEMPT_PATHS = ['/profiles', '/login', '/auth', '/api', '/admin', '/embed', '/watch']
const TURNSTILE_SITE_KEY = '0x4AAAAAADq8ZqJ0eM1Lu3-2'

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { activeProfile, loadProfiles, initialized } = useProfile()
  const pathname = usePathname()
  const router = useRouter()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [captchaPassed, setCaptchaPassed] = useState(false)
  const [captchaReady, setCaptchaReady] = useState(false)
  const [captchaError, setCaptchaError] = useState(false)
  const minDelayRef = useRef(false)
  const widgetRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isExempt = EXEMPT_PATHS.some(p => pathname.startsWith(p))

  // Splash + captcha à chaque chargement de page (pas juste le premier)
  useEffect(() => {
    const captchaOk = sessionStorage.getItem('captcha_passed')
    if (!captchaOk) {
      setShowSplash(true)
      setTimeout(() => { minDelayRef.current = true }, 2000)
    }
  }, [])

  // Charger le script Turnstile
  useEffect(() => {
    if (!showSplash) return
    if (document.getElementById('cf-turnstile-script')) {
      setCaptchaReady(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'cf-turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = () => setCaptchaReady(true)
    document.head.appendChild(script)
  }, [showSplash])

  // Rendre le widget Turnstile
  useEffect(() => {
    if (!captchaReady || !showSplash || !containerRef.current) return
    const win = window as any
    if (!win.turnstile) return

    // Nettoyer si déjà monté
    if (widgetRef.current) {
      try { win.turnstile.remove(widgetRef.current) } catch {}
      widgetRef.current = null
    }

    widgetRef.current = win.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'dark',
      size: 'normal',
      callback: (_token: string) => {
        sessionStorage.setItem('captcha_passed', '1')
        setCaptchaPassed(true)
      },
      'error-callback': () => {
        setCaptchaError(true)
      },
    })
  }, [captchaReady, showSplash])

  // Vérifier la session
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

  // Masquer le splash quand captcha OK + session OK + délai minimum
  useEffect(() => {
    if (!showSplash) return
    if (!captchaPassed) return
    if (!initialized || !sessionChecked) return
    const tryHide = () => {
      if (minDelayRef.current) { setShowSplash(false) }
      else { setTimeout(tryHide, 100) }
    }
    tryHide()
  }, [showSplash, captchaPassed, initialized, sessionChecked])

  // Rediriger vers /profiles si connecté sans profil actif
  useEffect(() => {
    if (!initialized || !sessionChecked || isExempt) return
    if (!isLoggedIn) return
    if (pathname === '/' && sessionStorage.getItem('just_logged_out') === '1') {
      sessionStorage.removeItem('just_logged_out')
      return
    }
    if (!activeProfile) {
      router.replace('/profiles')
    }
  }, [initialized, sessionChecked, isLoggedIn, activeProfile, isExempt, pathname])

  const needsRedirect = initialized && sessionChecked && isLoggedIn && !activeProfile && !isExempt

  if (showSplash) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(ellipse at center, #2a0a0a 0%, #0d0205 60%, #000000 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Logo */}
          <img
            src="/images/logo.png"
            alt="Logo"
            style={{
              width: 72, height: 72, objectFit: 'contain', marginBottom: 14,
              animation: 'fadeInScale 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
            }}
          />

          {/* Trait bleu */}
          <div style={{ width: 260, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              height: '1.5px',
              background: 'linear-gradient(90deg, transparent 0%, #1d6fe8 30%, #60a5fa 65%, transparent 100%)',
              boxShadow: '0 0 12px rgba(29,111,232,0.7), 0 0 28px rgba(29,111,232,0.3)',
              animation: 'slideIn 0.9s 0.35s cubic-bezier(0.22,1,0.36,1) both',
              transformOrigin: 'left',
            }} />
          </div>

          {/* Tagline */}
          <div style={{
            width: 260, letterSpacing: '0.15em', fontSize: 11, fontFamily: 'sans-serif',
            display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20,
            animation: 'fadeInUp 0.7s 1.1s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            <span style={{ color: 'rgba(200,180,180,0.55)', fontWeight: 700 }}>LE CINÉMA</span>
            <span style={{ color: '#1d6fe8', fontWeight: 700 }}>POUR TOUS</span>
          </div>

          {/* Captcha card */}
          <div style={{
            animation: 'fadeInUp 0.6s 1.4s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: '16px 20px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              gap: 12,
              minWidth: 280,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, fontFamily: 'sans-serif', letterSpacing: '0.01em' }}>
                  Vérification rapide
                </p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'sans-serif' }}>
                  Confirme que tu n'es pas un robot
                </p>
              </div>

              {/* Turnstile widget */}
              <div ref={containerRef} />

              {captchaError && (
                <p style={{ color: '#f87171', fontSize: 11, fontFamily: 'sans-serif', textAlign: 'center' as const }}>
                  Erreur de vérification — recharge la page
                </p>
              )}
            </div>
          </div>

        </div>

        <style>{`
          @keyframes fadeInScale { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
          @keyframes slideIn { from{transform:scaleX(0);opacity:0} to{transform:scaleX(1);opacity:1} }
          @keyframes fadeInUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </div>
    )
  }

  if (needsRedirect) return null

  return <>{children}</>
}
