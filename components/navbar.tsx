'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Menu, X, User, LogOut, Settings, Heart,
  Film, Tv, Home, Plus, Bell, Check, Trash2, ChevronRight, Shield, Shuffle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/components/session-provider'
import { useDrawer } from '@/components/movie-drawer'
import { useProfile } from '@/contexts/ProfileContext'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  image_url: string | null
  content_id: number | null
  content_type: string | null
  is_read: boolean
  created_at: string
}
interface NotifPrefs {
  new_movies: boolean
  new_series: boolean
  new_episodes: boolean
  request_approved: boolean
  request_rejected: boolean
  announcements: boolean
}
interface WatchHistory {
  id: string
  content_id: number
  content_type: 'movie' | 'series'
  title: string
  poster_url: string | null
  progress: number
  season?: number
  episode?: number
  finished: boolean
  watched_at: string
}

const navLinks = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/movies', label: 'Films', icon: Film },
  { href: '/series', label: 'Séries', icon: Tv },
  { href: '/request', label: "Souhaits", icon: Plus },
]

const moreLinks = [
  { href: '/favorites', label: 'Favoris', icon: Heart },
  { href: '/roulette', label: 'Roulette', icon: Shuffle },
]

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor(diff / 60000)
  if (days > 0) return `Il y a ${days}j`
  if (hours > 0) return `Il y a ${hours}h`
  return `Il y a ${mins}min`
}

const prefConfig = [
  { key: 'new_movies', label: 'Nouveaux films', icon: Film, color: 'bg-red-500/20 text-red-400' },
  { key: 'new_series', label: 'Nouvelles séries', icon: Tv, color: 'bg-red-500/20 text-red-400' },
  { key: 'new_episodes', label: 'Nouveaux épisodes', icon: Bell, color: 'bg-red-500/20 text-red-400' },
  { key: 'request_approved', label: 'Demande acceptée', icon: Check, color: 'bg-green-500/20 text-green-400' },
  { key: 'request_rejected', label: 'Demande refusée', icon: X, color: 'bg-red-500/20 text-red-400' },
  { key: 'announcements', label: 'Annonces', icon: Bell, color: 'bg-blue-500/20 text-blue-400' },
]

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-primary' : 'bg-white/20'}`}
    >
      <motion.div
        animate={{ x: enabled ? 23 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
      />
    </button>
  )
}

import { usePresence } from '@/hooks/use-presence'

export function Navbar() {
  const { user } = useSession()
  const { activeProfile, clearProfile } = useProfile()
  usePresence(user?.id)
  const { openDrawer } = useDrawer()

  const [rouletteParticles, setRouletteParticles] = useState<{id:number,x:number,y:number,color:string,angle:number,speed:number,size:number}[]>([])

  const playPopSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination)
      const notes = [
        { freq: 523.25, t: 0, dur: 0.35, type: 'triangle' as OscillatorType, vol: 0.5 },
        { freq: 659.25, t: 0.08, dur: 0.30, type: 'triangle' as OscillatorType, vol: 0.45 },
        { freq: 783.99, t: 0.16, dur: 0.30, type: 'triangle' as OscillatorType, vol: 0.4 },
        { freq: 1046.5, t: 0.24, dur: 0.5, type: 'sine' as OscillatorType, vol: 0.5 },
        { freq: 1318.5, t: 0.28, dur: 0.5, type: 'sine' as OscillatorType, vol: 0.35 },
      ]
      notes.forEach(({ freq, t, dur, type, vol }) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(master); osc.type = type; osc.frequency.value = freq
        gain.gain.setValueAtTime(0, ctx.currentTime + t)
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + t + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur)
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + dur + 0.05)
      })
    } catch {}
  }, [])

  const fireRouletteConfetti = useCallback(() => {
    const colors = ['#ff4444','#ff8800','#ffdd00','#44ff44','#4488ff','#cc44ff','#ff44aa','#ffffff']
    const burst = Array.from({ length: 60 }, (_, i) => ({
      id: Date.now() + i, x: Math.random() * 100, y: Math.random() * 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * 360, speed: 1 + Math.random() * 3,
      size: 4 + Math.random() * 6,
    }))
    setRouletteParticles(burst)
    setTimeout(() => setRouletteParticles([]), 4000)
  }, [])

  const handleRoulette = useCallback(async () => {
    try {
      const res = await fetch('/api/roulette/random')
      const data = await res.json()
      if (data?.tmdb_id && data?.type) {
        openDrawer(data.type, data.tmdb_id)
        setTimeout(() => { playPopSound(); fireRouletteConfetti() }, 300)
      }
    } catch {}
  }, [openDrawer, playPopSound, fireRouletteConfetti])

  const router = useRouter()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  const [showMore, setShowMore] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifPrefs, setShowNotifPrefs] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showNotifPrefsBell, setShowNotifPrefsBell] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    new_movies: true, new_series: true, new_episodes: true,
    request_approved: true, request_rejected: true, announcements: true,
  })
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const mobileBellRef = useRef<HTMLButtonElement>(null)
  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    const isOpen = showProfile || isMobileMenuOpen
    if (isOpen) {
      const scrollY = window.scrollY
      document.body.dataset.scrollY = String(scrollY)
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.overflow = 'hidden'
    } else {
      const scrollY = parseInt(document.body.dataset.scrollY || '0')
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      delete document.body.dataset.scrollY
      window.scrollTo(0, scrollY)
    }
    return () => {
      const scrollY = parseInt(document.body.dataset.scrollY || '0')
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      delete document.body.dataset.scrollY
      if (scrollY) window.scrollTo(0, scrollY)
    }
  }, [showProfile, isMobileMenuOpen])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let ticking = false
    const fn = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    if (user) { fetchNotifications(); fetchNotifPrefs() }
  }, [user])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const inNotif = notifRef.current && notifRef.current.contains(e.target as Node)
      const inMobileBell = mobileBellRef.current && mobileBellRef.current.contains(e.target as Node)
      if (!inNotif && !inMobileBell) {
        setShowNotifications(false)
        setShowNotifPrefsBell(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false)
        setSearchResults([])
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const fetchNotifications = async () => {
    if (!user) return
    setLoadingNotifs(true)
    try {
      const res = await fetch(`/api/notifications?user_id=${user.id}`)
      const data = await res.json()
      setNotifications(Array.isArray(data) ? data : [])
    } catch {}
    setLoadingNotifs(false)
  }

  const fetchNotifPrefs = async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/notification-preferences?user_id=${user.id}`)
      if (res.ok) { const data = await res.json(); if (data) setNotifPrefs(data) }
    } catch {}
  }

  const fetchWatchHistory = async () => {
    if (!user) return
    setLoadingHistory(true)
    try {
      const profileId = document.cookie.split('; ').find(r => r.startsWith('active_profile_id='))?.split('=')[1] || null
      const param = profileId ? `profile_id=${profileId}` : `user_id=${user.id}`
      const res = await fetch(`/api/watch-history?${param}&limit=5`)
      if (res.ok) { const data = await res.json(); setWatchHistory(Array.isArray(data) ? data : []) }
    } catch {}
    setLoadingHistory(false)
  }

  const updatePref = async (key: string, value: boolean) => {
    if (!user) return
    const newPrefs = { ...notifPrefs, [key]: value }
    setNotifPrefs(newPrefs as NotifPrefs)
    await fetch('/api/notification-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, ...newPrefs }),
    })
  }

  const markAllRead = async () => {
    if (!user) return
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, mark_all: true }) })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const clearAll = async () => {
    if (!user) return
    await fetch(`/api/notifications?user_id=${user.id}`, { method: 'DELETE' })
    setNotifications([])
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) { window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`; setSearchResults([]) }
  }

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value)
    if (!value.trim()) { setSearchResults([]); return }
    try {
      const res = await fetch(`/api/auth/admin/tmdb-search?q=${encodeURIComponent(value)}&type=movie`)
      const resTV = await fetch(`/api/auth/admin/tmdb-search?q=${encodeURIComponent(value)}&type=tv`)
      const movies = (await res.json()).results?.slice(0, 3).map((r: any) => ({ ...r, media_type: 'movie' })) || []
      const series = (await resTV.json()).results?.slice(0, 3).map((r: any) => ({ ...r, media_type: 'series' })) || []
      setSearchResults([...movies, ...series].slice(0, 6))
    } catch {}
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const closeMobileSearch = () => {
    setIsMobileSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const avatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png` : null

  const openProfile = () => {
    setShowProfile(true)
    setShowNotifications(false)
    setShowNotifPrefsBell(false)
    setShowNotifPrefs(false)
    fetchWatchHistory()
  }

  const closeProfile = () => {
    setShowProfile(false)
    setShowNotifPrefs(false)
  }

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none pt-3">

      <div className="relative flex items-center h-[64px] pl-0 pr-3 md:px-6">

        {/* Logo */}
        <div className="pointer-events-auto flex-shrink-0 ml-4">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="StreamSelf" width={64} height={64} className="h-14 md:h-14 w-auto"
            />
          </Link>
        </div>

        {/* Pill central desktop */}
        <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 hidden md:flex">
          <div
            className="flex items-center h-[44px] px-1.5 gap-0.5 rounded-full transition-all duration-300"
            style={{
              background: isScrolled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.04)',
              boxShadow: 'none',
            }}
          >
            {navLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <Link key={link.href} href={link.href} className="select-none">
                  <div className={cn(
                    'px-3.5 py-1.5 rounded-full transition-all duration-150 text-[13px] font-semibold whitespace-nowrap',
                    isActive ? 'bg-white text-black' : 'text-white/55 hover:text-white'
                  )}>
                    {link.label}
                  </div>
                </Link>
              )
            })}

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Confettis roulette */}
            {rouletteParticles.length > 0 && typeof document !== 'undefined' && createPortal(
              <div className="fixed inset-0 pointer-events-none z-[9999]">
                {rouletteParticles.map(p => (
                  <div key={p.id} style={{
                    position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
                    width: p.size, height: p.size, background: p.color, borderRadius: '2px',
                    animation: `confettiFall ${2 + p.speed}s ease-in forwards`,
                    transform: `rotate(${p.angle}deg)`,
                  }} />
                ))}
                <style>{`@keyframes confettiFall { to { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`}</style>
              </div>,
              document.body
            )}

            {/* Roulette */}
            <button onClick={handleRoulette} title="Roulette" className="select-none">
              <style>{`@keyframes diceSpin { 0% { transform: rotate(0deg) scale(1); } 40% { transform: rotate(200deg) scale(1.2); } 70% { transform: rotate(320deg) scale(0.95); } 100% { transform: rotate(360deg) scale(1); } }`}</style>
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150',
                pathname === '/roulette' ? 'bg-white/15' : 'hover:bg-white/10'
              )}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                  id="navbar-dice"
                  onMouseDown={(e) => {
                    const el = e.currentTarget
                    el.style.animation = 'none'
                    void el.offsetWidth
                    el.style.animation = 'diceSpin 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards'
                  }}
                >
                  {/* Dé arrière */}
                  <rect x="8" y="1" width="13" height="13" rx="2" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6"/>
                  <circle cx="12" cy="5" r="1" fill="white" opacity="0.6"/>
                  <circle cx="17" cy="5" r="1" fill="white" opacity="0.6"/>
                  <circle cx="17" cy="10" r="1" fill="white" opacity="0.6"/>
                  {/* Dé avant */}
                  <rect x="3" y="10" width="13" height="13" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
                  <circle cx="7" cy="14" r="1" fill="white"/>
                  <circle cx="12" cy="14" r="1" fill="white"/>
                  <circle cx="7" cy="19" r="1" fill="white"/>
                  <circle cx="12" cy="19" r="1" fill="white"/>
                  <circle cx="9.5" cy="16.5" r="1" fill="white"/>
                </svg>
              </div>
            </button>

          </div>
        </div>

        {/* Bell + Avatar desktop */}
        {user && (
          <div className="pointer-events-auto ml-auto hidden md:flex items-center gap-2">

            {/* Loupe + Cloche dans la même pill */}
            <div className="flex items-center rounded-full overflow-visible" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>

              {/* Search */}
              <div ref={searchRef} className="relative flex items-center">
                <AnimatePresence mode="wait">
                  {isSearchOpen ? (
                    <motion.div
                      key="open"
                      initial={{ width: 0, opacity: 0 }} animate={{ width: 180, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      className="flex items-center px-3 gap-2 h-9 overflow-hidden"
                    >
                      <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                      <input
                        value={searchQuery}
                        onChange={e => handleSearchChange(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch(e as any)}
                        placeholder="Rechercher..."
                        className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/30 w-full"
                        autoFocus
                      />
                      {searchQuery && (
                        <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
                          <X className="w-3 h-3 text-white/30 hover:text-white/60" />
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.button
                      key="closed"
                      onClick={() => setIsSearchOpen(true)}
                      className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    >
                      <Search className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Dropdown résultats */}
                <AnimatePresence>
                  {isSearchOpen && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                      className="absolute top-12 right-0 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
                      style={{ background: 'rgba(12,6,8,0.96)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      {searchResults.map(result => {
                        const title = result.title || result.name || ''
                        const date = result.release_date || result.first_air_date || ''
                        const year = date ? new Date(date).getFullYear() : ''
                        const isMovieResult = result.media_type === 'movie'
                        const poster = result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : null
                        return (
                          <button key={`${result.media_type}-${result.id}`}
                            onClick={() => { setIsSearchOpen(false); setSearchResults([]); setSearchQuery(''); openDrawer(isMovieResult ? 'movie' : 'series', result.id) }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/[0.05] last:border-0 text-left bg-transparent outline-none cursor-pointer"
                          >
                            <div className="relative w-9 h-[52px] rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                              {poster ? <Image src={poster} alt={title} fill className="object-cover" sizes="36px" /> : <div className="w-full h-full bg-zinc-700" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-sm truncate">{title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-md font-medium">{isMovieResult ? 'FILM' : 'SÉRIE'}</span>
                                {year && <span className="text-white/30 text-xs">{year}</span>}
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Séparateur */}
              <div className="w-px h-4 bg-white/10" />

              {/* Bell */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowNotifPrefsBell(false); if (!showNotifications) fetchNotifications() }}
                  className="relative w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>

            </div>

            <button
              onClick={openProfile}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                {activeProfile?.avatar_url ? (
                  <Image src={activeProfile.avatar_url} alt={activeProfile.name} width={28} height={28} className="rounded-full object-cover" />
                ) : avatarUrl ? (
                  <Image src={avatarUrl} alt={user.username} width={28} height={28} className="rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-red-600 flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="text-left">
                <p className="text-white text-[12px] font-bold leading-tight">{activeProfile?.name || user.username}</p>
                <p className="text-white/40 text-[10px] leading-tight">@{user.username}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/30 ml-1" />
            </button>
          </div>
        )}

        {/* Connexion desktop */}
        {!user && (
          <div className="pointer-events-auto ml-auto hidden md:flex" style={{ marginRight: '1rem' }}>
            <Link href="/login">
              <div
                className="flex items-center gap-2 px-5 py-2 rounded-full text-white text-[13px] font-semibold tracking-wide transition-all duration-200 hover:bg-white/10"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(12px)',
                  letterSpacing: '0.02em',
                }}
              >
                <LogOut className="w-3.5 h-3.5 rotate-180" />
                Connexion
              </div>
            </Link>
          </div>
        )}

        {/* Logout modal */}
        {mounted && createPortal(
          <AnimatePresence>
            {showLogoutModal && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200]"
                  style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
                  onClick={() => setShowLogoutModal(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="fixed z-[201] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] rounded-3xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(160deg, rgba(30,10,10,0.98) 0%, rgba(18,8,8,0.99) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Glow rouge haut */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse, rgba(220,38,38,0.25) 0%, transparent 70%)', filter: 'blur(12px)' }} />

                  <div className="relative px-8 pt-8 pb-6 flex flex-col items-center text-center">
                    {/* Icône */}
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                      style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.3), rgba(180,10,10,0.2))', border: '1px solid rgba(220,38,38,0.3)', boxShadow: '0 8px 24px rgba(220,38,38,0.2)' }}>
                      <LogOut className="w-7 h-7 text-red-400" />
                    </div>

                    <h2 className="text-white font-black text-xl mb-2">Déconnexion</h2>
                    <p className="text-white/40 text-sm leading-relaxed mb-7">
                      Tu vas être déconnecté de ton compte StreamSelf. Tu pourras te reconnecter à tout moment.
                    </p>

                    {/* Bouton confirmer */}
                    <button
                      onClick={async () => { setShowLogoutModal(false); clearProfile(); await fetch('/api/auth/logout'); window.location.href = '/' }}
                      className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-bold text-[15px] mb-3 transition-all active:scale-95"
                      style={{
                        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        boxShadow: '0 4px 24px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Oui, me déconnecter
                    </button>

                    {/* Bouton annuler */}
                    <button
                      onClick={() => setShowLogoutModal(false)}
                      className="w-full py-4 rounded-2xl text-white/50 font-semibold text-[15px] transition-all hover:text-white/80 hover:bg-white/5"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      Annuler
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Mobile — Search toujours visible + Bell si connecté */}
        <div className="pointer-events-auto ml-auto md:hidden flex items-center gap-2">
          {/* Search button — toujours visible */}
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Search className="w-[17px] h-[17px]" />
          </button>
          {/* Bell — uniquement si connecté */}
          {user && (
            <button
              ref={mobileBellRef}
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); if (!showNotifications) fetchNotifications() }}
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Bell className="w-[17px] h-[17px]" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Panel notifications — portal desktop + mobile */}
      {mounted && createPortal(
        <AnimatePresence>
          {(showNotifications || showNotifPrefsBell) && (
            <motion.div
              ref={notifRef}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="fixed z-[150] overflow-hidden rounded-2xl"
              style={{
                top: 70,
                right: 16,
                width: 'min(380px, calc(100vw - 32px))',
                background: 'linear-gradient(145deg, rgba(28,12,12,0.92) 0%, rgba(10,10,14,0.96) 60%, rgba(20,8,20,0.93) 100%)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(32px)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(220,38,38,0.18) 0%, transparent 70%)', filter: 'blur(20px)' }} />
              {!showNotifPrefsBell ? (
                <>
                  <div className="relative px-5 pt-5 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(185,28,28,0.12))', border: '1px solid rgba(239,68,68,0.25)' }}>
                          <Bell className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-[15px] leading-tight">Notifications</p>
                          {unreadCount > 0
                            ? <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
                            : <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Tout est à jour</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && <button onClick={markAllRead} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:bg-green-500/10 hover:text-green-400 transition-all"><Check className="w-3.5 h-3.5" /></button>}
                        {notifications.length > 0 && <button onClick={clearAll} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>}
                        <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:bg-white/7 hover:text-white transition-all"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)', margin: '0 20px' }} />
                  <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
                    {loadingNotifs ? (
                      <div className="flex items-center justify-center py-12"><div className="w-5 h-5 rounded-full" style={{ border: '2px solid rgba(239,68,68,0.2)', borderTopColor: 'rgba(239,68,68,0.7)', animation: 'spin 0.8s linear infinite' }} /></div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}><Bell className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.15)' }} /></div>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Aucune notification</p>
                      </div>
                    ) : (
                      <div className="py-2">
                        {notifications.map((notif, i) => (
                          <motion.div key={notif.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                            className="group flex gap-3.5 px-5 py-3.5 cursor-pointer relative transition-all hover:bg-white/[0.03]"
                            style={notif.is_read ? {} : { background: 'linear-gradient(90deg, rgba(239,68,68,0.07), transparent)' }}
                            onClick={async () => {
                              await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notification_id: notif.id, user_id: user?.id }) })
                              setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
                              if (notif.content_id && notif.content_type) { setShowNotifications(false); setTimeout(() => openDrawer(notif.content_type as 'movie' | 'series', notif.content_id!), 150) }
                            }}>
                            {!notif.is_read && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 rounded-r-full" style={{ background: 'linear-gradient(to bottom, rgba(239,68,68,0.9), rgba(185,28,28,0.5))' }} />}
                            {notif.image_url ? (
                              <div className="relative w-11 h-[62px] flex-shrink-0 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}><Image src={notif.image_url} alt="" fill className="object-cover" sizes="44px" /></div>
                            ) : (
                              <div className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.08))', border: '1px solid rgba(239,68,68,0.15)' }}><Bell className="w-4 h-4 text-red-400" /></div>
                            )}
                            <div className="flex-1 min-w-0 py-0.5">
                              <p className="text-[13px] font-semibold mb-1 leading-tight" style={{ color: notif.is_read ? 'rgba(255,255,255,0.6)' : 'white' }}>{notif.title}</p>
                              <p className="text-[12px] line-clamp-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{notif.message}</p>
                              <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>{timeAgo(notif.created_at)}</p>
                            </div>
                            {!notif.is_read && <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: 'radial-gradient(circle, rgb(239,68,68), rgb(185,28,28))', boxShadow: '0 0 8px rgba(239,68,68,0.7)' }} />}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent)' }} />
                  <button onClick={() => setShowNotifPrefsBell(true)} className="w-full flex items-center justify-center gap-2 py-3.5 text-xs font-medium text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all">
                    <Settings className="w-3.5 h-3.5" />Préférences d&apos;alertes
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button onClick={() => setShowNotifPrefsBell(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:bg-white/7 hover:text-white transition-all"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                    <p className="font-bold text-white text-[15px]">Préférences</p>
                  </div>
                  <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)', margin: '0 20px' }} />
                  <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                    {prefConfig.map(pref => {
                      const Icon = pref.icon
                      const enabled = notifPrefs[pref.key as keyof NotifPrefs]
                      return (
                        <div key={pref.key} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pref.color}`}><Icon className="w-3.5 h-3.5" /></div>
                          <p className="text-sm font-medium flex-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{pref.label}</p>
                          <Toggle enabled={enabled} onChange={v => updatePref(pref.key, v)} />
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Recherche mobile — portal séparé, contrôlé par isMobileSearchOpen uniquement */}
      {mounted && createPortal(
        <AnimatePresence>
          {isMobileSearchOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[190] bg-black/50 backdrop-blur-sm"
                onClick={closeMobileSearch}
              />
              {/* Pill de recherche centrée en haut */}
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed z-[200]"
                style={{
                  top: 16,
                  left: 16,
                  right: 16,
                  maxWidth: '440px',
                  margin: '0 auto',
                }}
              >
                <div
                  className="flex items-center h-[44px] px-3 gap-2 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <Search className="w-4 h-4 text-white/50 shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch(e as any)}
                    placeholder="Rechercher un film, une série..."
                    className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/35"
                    autoFocus
                  />
                  {searchQuery ? (
                    <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
                      <X className="w-4 h-4 text-white/40 hover:text-white/70" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={closeMobileSearch}
                      className="text-white/40 text-sm font-medium shrink-0 pr-1"
                    >
                      Annuler
                    </button>
                  )}
                </div>

                {/* Dropdown résultats mobile */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                      className="mt-2 rounded-2xl shadow-2xl overflow-hidden"
                      style={{ background: 'rgba(12,6,8,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      {searchResults.map(result => {
                        const title = result.title || result.name || ''
                        const date = result.release_date || result.first_air_date || ''
                        const year = date ? new Date(date).getFullYear() : ''
                        const isMovieResult = result.media_type === 'movie'
                        const poster = result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : null
                        return (
                          <button
                            key={`${result.media_type}-${result.id}`}
                            onClick={() => {
                              closeMobileSearch()
                              setTimeout(() => openDrawer(isMovieResult ? 'movie' : 'series', result.id), 300)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/[0.05] last:border-0 text-left bg-transparent outline-none cursor-pointer"
                          >
                            <div className="relative w-9 h-[52px] rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                              {poster ? <Image src={poster} alt={title} fill className="object-cover" sizes="36px" /> : <div className="w-full h-full bg-zinc-700" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-sm truncate">{title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-md font-medium">{isMovieResult ? 'FILM' : 'SÉRIE'}</span>
                                {year && <span className="text-white/30 text-xs">{year}</span>}
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Profile panel */}
      {mounted && createPortal(
        <AnimatePresence>
          {showProfile && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={closeProfile} />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 340, damping: 38 }}
                className="fixed top-0 right-0 bottom-0 w-full md:w-[340px] z-[70] flex flex-col overflow-hidden"
                style={{ background: '#0e0e0f' }}
              >
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {avatarUrl && (
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(60px) saturate(2)', transform: 'scale(1.4)' }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#0e0e0f]/80 to-[#0e0e0f]" />
                </div>
                <div className="relative flex-1 overflow-y-auto overscroll-contain">
                  <div className="px-5 pt-10 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-[68px] h-[68px] rounded-full overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                          {activeProfile?.avatar_url ? (
                            <Image src={activeProfile.avatar_url} alt={activeProfile.name} width={68} height={68} className="w-full h-full object-cover" />
                          ) : avatarUrl ? (
                            <Image src={avatarUrl} alt={user.username} width={68} height={68} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-red-600 flex items-center justify-center">
                              <span className="text-white font-bold text-2xl">{(activeProfile?.name || user.username)[0].toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0e0e0f]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Nom du profil actif */}
                        <p className="text-white font-bold text-lg leading-tight">{activeProfile?.name || user.username}</p>
                        {/* Nom du compte en dessous */}
                        <p className="text-white/30 text-xs mt-0.5">@{user.username}</p>
                      </div>
                      <button onClick={closeProfile} className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/10 flex items-center justify-center transition-colors self-start">
                        <X className="w-4 h-4 text-white/50" />
                      </button>
                    </div>
                  </div>
                  <div className="px-4 space-y-2 mb-8">
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <button onClick={() => setShowNotifPrefs(!showNotifPrefs)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] transition-colors">
                        <Settings className="w-4 h-4 text-white/40 flex-shrink-0" />
                        <span className="text-white/80 text-sm font-medium flex-1 text-left">Gérer les notifications</span>
                        <motion.div animate={{ rotate: showNotifPrefs ? 90 : 0 }} transition={{ duration: 0.2 }}><ChevronRight className="w-3.5 h-3.5 text-white/20" /></motion.div>
                      </button>
                      <AnimatePresence>
                        {showNotifPrefs && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                            <div className="border-t border-white/[0.05] px-4 py-3 space-y-3">
                              {prefConfig.map(pref => {
                                const Icon = pref.icon
                                const enabled = notifPrefs[pref.key as keyof NotifPrefs]
                                return (
                                  <div key={pref.key} className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${pref.color}`}><Icon className="w-3.5 h-3.5" /></div>
                                    <p className="text-white/60 text-xs font-medium flex-1">{pref.label}</p>
                                    <Toggle enabled={enabled} onChange={v => updatePref(pref.key, v)} />
                                  </div>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <Link href="/favorites" onClick={closeProfile} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] transition-colors group" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Heart className="w-4 h-4 text-white/40 flex-shrink-0" />
                      <span className="text-white/80 text-sm font-medium flex-1">Mes favoris</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                    </Link>
                    <Link href="/profiles" onClick={closeProfile} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] transition-colors group" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                      <span className="text-white/80 text-sm font-medium flex-1">Changer de profil</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                    </Link>
                    {user.is_admin && (
                      <Link href="/admin" onClick={closeProfile} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] transition-colors group" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <Shield className="w-4 h-4 text-white/40 flex-shrink-0" />
                        <span className="text-white/80 text-sm font-medium flex-1">Administration</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                      </Link>
                    )}
                    <button onClick={() => setShowLogoutModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-red-500/[0.08] transition-colors"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                      <LogOut className="w-4 h-4 text-red-400/70 flex-shrink-0" />
                      <span className="text-red-400/80 text-sm font-medium">Déconnexion</span>
                    </button>
                  </div>
                  <div className="px-4 pb-10">
                    <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-3 px-1">Derniers visionnages</p>
                    {loadingHistory ? (
                      <div className="flex justify-center py-10"><div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" /></div>
                    ) : watchHistory.length === 0 ? (
                      <div className="text-center py-8 text-white/20 text-sm">Aucun visionnage récent</div>
                    ) : (
                      <div className="space-y-2">
                        {watchHistory.map(item => (
                          <button key={item.id}
                            onClick={() => {
                              closeProfile()
                              setTimeout(() => openDrawer(item.content_type as 'movie' | 'series', item.content_id), 200)
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.04] transition-colors relative text-left"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {!item.finished && item.progress > 0 && <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full" />}
                            <div className="relative w-10 h-[58px] rounded-xl overflow-hidden bg-zinc-800/60 flex-shrink-0">
                              {item.poster_url ? <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="40px" /> : <div className="w-full h-full flex items-center justify-center">{item.content_type === 'movie' ? <Film className="w-4 h-4 text-zinc-600" /> : <Tv className="w-4 h-4 text-zinc-600" />}</div>}
                            </div>
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={cn('inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded', item.content_type === 'movie' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400')}>
                                  {item.content_type === 'movie' ? <Film className="w-2 h-2" /> : <Tv className="w-2 h-2" />}
                                  {item.content_type === 'movie' ? 'FILM' : 'SÉRIE'}
                                </span>
                                {item.content_type === 'series' && item.season && item.episode && (
                                  <span className="text-[10px] text-white/30 font-medium">S{String(item.season).padStart(2, '0')}·E{String(item.episode).padStart(2, '0')}</span>
                                )}
                              </div>
                              <p className="text-white/80 text-sm font-semibold truncate leading-tight">{item.title}</p>
                              <p className="text-white/30 text-xs mt-0.5">
                                {item.finished ? <span className="flex items-center gap-1 text-green-400/60"><Check className="w-2.5 h-2.5" />Terminé</span> : `${item.progress}% · ${timeAgo(item.watched_at)}`}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        , document.body)}

    </header>

    {/* Mobile Bottom Navbar */}
    <nav className="md:hidden fixed z-[90] pointer-events-auto"
      style={{
        bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '440px',
      }}>
      <div className="flex items-center h-[68px] px-1.5 rounded-[26px]"
        style={{
          background: 'rgba(13,13,15,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>

        {/* Accueil */}
        <Link href="/" className="flex-1 flex flex-col items-center justify-center gap-[3px] relative py-2" style={{ WebkitTapHighlightColor: 'transparent' }}>
          {pathname === '/' && <motion.div layoutId="mobileNavPill" className="absolute inset-1 rounded-[20px]" style={{ background: 'rgba(220,38,38,0.13)' }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          <Home className={`w-[22px] h-[22px] relative z-10 ${pathname === '/' ? 'text-red-400' : 'text-white/35'}`} strokeWidth={pathname === '/' ? 2.3 : 1.7} />
          <span className={`text-[9px] font-bold tracking-widest uppercase relative z-10 ${pathname === '/' ? 'text-white/80' : 'text-white/28'}`}>Accueil</span>
        </Link>

        {/* Films */}
        <Link href="/movies" className="flex-1 flex flex-col items-center justify-center gap-[3px] relative py-2" style={{ WebkitTapHighlightColor: 'transparent' }}>
          {pathname === '/movies' && <motion.div layoutId="mobileNavPill" className="absolute inset-1 rounded-[20px]" style={{ background: 'rgba(220,38,38,0.13)' }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          <Film className={`w-[22px] h-[22px] relative z-10 ${pathname === '/movies' ? 'text-red-400' : 'text-white/35'}`} strokeWidth={pathname === '/movies' ? 2.3 : 1.7} />
          <span className={`text-[9px] font-bold tracking-widest uppercase relative z-10 ${pathname === '/movies' ? 'text-white/80' : 'text-white/28'}`}>Films</span>
        </Link>

        {/* Séries */}
        <Link href="/series" className="flex-1 flex flex-col items-center justify-center gap-[3px] relative py-2" style={{ WebkitTapHighlightColor: 'transparent' }}>
          {pathname === '/series' && <motion.div layoutId="mobileNavPill" className="absolute inset-1 rounded-[20px]" style={{ background: 'rgba(220,38,38,0.13)' }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          <Tv className={`w-[22px] h-[22px] relative z-10 ${pathname === '/series' ? 'text-red-400' : 'text-white/35'}`} strokeWidth={pathname === '/series' ? 2.3 : 1.7} />
          <span className={`text-[9px] font-bold tracking-widest uppercase relative z-10 ${pathname === '/series' ? 'text-white/80' : 'text-white/28'}`}>Séries</span>
        </Link>

        {/* Souhaits */}
        <Link href="/request" className="flex-1 flex flex-col items-center justify-center gap-[3px] relative py-2" style={{ WebkitTapHighlightColor: 'transparent' }}>
          {pathname === '/request' && <motion.div layoutId="mobileNavPill" className="absolute inset-1 rounded-[20px]" style={{ background: 'rgba(220,38,38,0.13)' }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          <Plus className={`w-[22px] h-[22px] relative z-10 ${pathname === '/request' ? 'text-red-400' : 'text-white/35'}`} strokeWidth={pathname === '/request' ? 2.3 : 1.7} />
          <span className={`text-[9px] font-bold tracking-widest uppercase relative z-10 ${pathname === '/request' ? 'text-white/80' : 'text-white/28'}`}>Souhaits</span>
        </Link>

        {/* Profil */}
        <button onClick={user ? (showProfile ? closeProfile : openProfile) : () => { window.location.href = '/login' }}
          className="flex-1 flex flex-col items-center justify-center gap-[3px] relative py-2"
          style={{ WebkitTapHighlightColor: 'transparent' }}>
          {showProfile && <motion.div layoutId="mobileNavPill" className="absolute inset-1 rounded-[20px]" style={{ background: 'rgba(220,38,38,0.13)' }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
          {user && (activeProfile?.avatar_url || avatarUrl)
            ? <Image src={activeProfile?.avatar_url || avatarUrl!} alt={activeProfile?.name || user.username} width={22} height={22} className={`w-[22px] h-[22px] rounded-full object-cover relative z-10 ${showProfile ? 'ring-2 ring-red-400' : 'ring-1 ring-white/20'}`} />
            : <User className={`w-[22px] h-[22px] relative z-10 ${showProfile ? 'text-red-400' : 'text-white/35'}`} strokeWidth={showProfile ? 2.3 : 1.7} />
          }
          <span className={`text-[9px] font-bold tracking-widest uppercase relative z-10 ${showProfile ? 'text-white/80' : 'text-white/28'}`}>Profil</span>
        </button>

      </div>
    </nav>

    </>
  )
}
