'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  Search, Menu, X, User, LogOut, Settings, Heart,
  Film, Tv, Home, Plus, Bell, Check, Trash2, ChevronRight, Shield, Shuffle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSession } from '@/components/session-provider'

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
  { href: '/request', label: 'Demander', icon: Plus },
  { href: '/roulette', label: 'Roulette', icon: Shuffle, highlight: true },
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

export function Navbar() {
  const { user } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const searchRef = useRef<HTMLDivElement>(null)

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

  const [mounted, setMounted] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
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
          const scrollTop = window.scrollY
          const docHeight = document.documentElement.scrollHeight - window.innerHeight
          setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
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
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
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
      const res = await fetch(`/api/watch-history?user_id=${user.id}&limit=5`)
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
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500 pt-3',
        isScrolled
          ? 'bg-black/60 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      )}
    >
      {/* Scroll progress line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-transparent">
        <motion.div
          className="h-full"
          style={{
            width: `${scrollProgress}%`,
            background: 'linear-gradient(to right, #991b1b, #ef4444, #f97316)',
            boxShadow: '0 0 8px rgba(239,68,68,0.6)',
          }}
          transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 0.3 }}
        />
      </div>

      <div className="w-full px-5 md:px-8">
        <div className="flex items-center justify-between h-[58px] gap-4 -mt-2">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 mr-2 -ml-2">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT_Image_27_avr._2026_a%CC%80_00_48_07-removebg-preview-q9gJZZAURjXxiGLwtVf8BsKdJaOxq9.png"
              alt="StreamSelf" width={280} height={84} className="h-7 md:h-20 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <LayoutGroup id="navbar">
              {navLinks.map(link => {
                const isActive = pathname === link.href
                return (
                  <Link key={link.href} href={link.href} className="relative select-none">
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.10)' }}
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <div
                      className={cn(
                        'relative z-10 px-[14px] py-[7px] rounded-lg transition-colors duration-150',
                        'uppercase tracking-[0.14em] text-[13px] font-bold',
                        isActive ? 'text-white' : 'text-white/38 hover:text-white/65'
                      )}
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}
                    >
                      {link.label}
                    </div>
                  </Link>
                )
              })}
            </LayoutGroup>
          </nav>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-1.5">

            {/* Search */}
            <div ref={searchRef} className="relative">
              <AnimatePresence>
                {isSearchOpen ? (
                  <motion.form
                    initial={{ width: 36, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 36, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    onSubmit={handleSearch}
                  >
                    <div className="flex items-center bg-white/[0.07] border border-white/10 rounded-full px-3.5 py-2 gap-2">
                      <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      <input
                        value={searchQuery}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Rechercher..."
                        className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/25 w-full"
                        autoFocus
                      />
                      {searchQuery && (
                        <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
                          <X className="w-3.5 h-3.5 text-white/30 hover:text-white/60" />
                        </button>
                      )}
                    </div>
                  </motion.form>
                ) : (
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-all"
                  >
                    <Search className="w-4.5 h-4.5" />
                  </button>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isSearchOpen && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                    className="absolute right-0 top-12 w-80 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    {searchResults.map(result => {
                      const title = result.title || result.name || ''
                      const date = result.release_date || result.first_air_date || ''
                      const year = date ? new Date(date).getFullYear() : ''
                      const isMovie = result.media_type === 'movie'
                      const poster = result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : null
                      return (
                        <Link key={`${result.media_type}-${result.id}`}
                          href={`/watch/${result.media_type}/${result.id}`}
                          onClick={() => { setIsSearchOpen(false); setSearchResults([]); setSearchQuery('') }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/[0.05] last:border-0"
                        >
                          <div className="relative w-9 h-[52px] rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                            {poster ? <Image src={poster} alt={title} fill className="object-cover" sizes="36px" /> : <div className="w-full h-full bg-zinc-700" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-md font-medium">{isMovie ? 'FILM' : 'SÉRIE'}</span>
                              {year && <span className="text-white/30 text-xs">{year}</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                        </Link>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {user ? (
              <>
                {/* Bell */}
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications)
                      setShowProfile(false)
                      setShowNotifPrefsBell(false)
                      if (!showNotifications) fetchNotifications()
                    }}
                    className="relative w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-all"
                  >
                    <Bell className="w-4.5 h-4.5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {(showNotifications || showNotifPrefsBell) && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="absolute right-0 top-12 w-[380px] z-50 overflow-hidden rounded-2xl"
                        style={{
                          background: 'linear-gradient(145deg, rgba(28,12,12,0.92) 0%, rgba(10,10,14,0.96) 60%, rgba(20,8,20,0.93) 100%)',
                          border: '1px solid rgba(255,255,255,0.09)',
                          backdropFilter: 'blur(32px)',
                          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.08) inset',
                        }}
                      >
                        {/* Ambient glow top */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 pointer-events-none"
                          style={{ background: 'radial-gradient(ellipse, rgba(220,38,38,0.18) 0%, transparent 70%)', filter: 'blur(20px)' }} />

                        {!showNotifPrefsBell ? (
                          <>
                            {/* Header */}
                            <div className="relative px-5 pt-5 pb-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(185,28,28,0.12))', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 0 12px rgba(239,68,68,0.15)' }}>
                                    <Bell className="w-4 h-4 text-red-400" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-white text-[15px] leading-tight">Notifications</p>
                                    {unreadCount > 0
                                      ? <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
                                      : <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Tout est à jour</p>
                                    }
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {unreadCount > 0 && (
                                    <button onClick={markAllRead} title="Tout marquer lu"
                                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                      style={{ color: 'rgba(255,255,255,0.3)' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)'; e.currentTarget.style.color = 'rgb(52,211,153)' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}>
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {notifications.length > 0 && (
                                    <button onClick={clearAll} title="Tout effacer"
                                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                      style={{ color: 'rgba(255,255,255,0.3)' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'rgb(239,68,68)' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button onClick={() => setShowNotifications(false)}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'white' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}>
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Separator */}
                            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)', margin: '0 20px' }} />

                            {/* List */}
                            <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
                              {loadingNotifs ? (
                                <div className="flex items-center justify-center py-12">
                                  <div className="w-5 h-5 rounded-full" style={{ border: '2px solid rgba(239,68,68,0.2)', borderTopColor: 'rgba(239,68,68,0.7)', animation: 'spin 0.8s linear infinite' }} />
                                </div>
                              ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 gap-3">
                                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <Bell className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.15)' }} />
                                  </div>
                                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Aucune notification</p>
                                </div>
                              ) : (
                                <div className="py-2">
                                  {notifications.map((notif, i) => (
                                    <motion.div
                                      key={notif.id}
                                      initial={{ opacity: 0, x: -6 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.035 }}
                                      className="group flex gap-3.5 px-5 py-3.5 cursor-pointer relative transition-all"
                                      style={notif.is_read
                                        ? { background: 'transparent' }
                                        : { background: 'linear-gradient(90deg, rgba(239,68,68,0.07), transparent)' }
                                      }
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = notif.is_read ? 'transparent' : 'linear-gradient(90deg, rgba(239,68,68,0.07), transparent)' }}
                                      onClick={async () => {
                                        await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notification_id: notif.id, user_id: user.id }) })
                                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
                                        if (notif.content_id && notif.content_type) { setShowNotifications(false); router.push(`/watch/${notif.content_type}/${notif.content_id}`) }
                                      }}
                                    >
                                      {/* Unread bar */}
                                      {!notif.is_read && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 rounded-r-full"
                                          style={{ background: 'linear-gradient(to bottom, rgba(239,68,68,0.9), rgba(185,28,28,0.5))', boxShadow: '0 0 8px rgba(239,68,68,0.4)' }} />
                                      )}

                                      {/* Poster */}
                                      {notif.image_url ? (
                                        <div className="relative w-11 h-[62px] flex-shrink-0 rounded-xl overflow-hidden"
                                          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                          <Image src={notif.image_url} alt="" fill className="object-cover" sizes="44px" />
                                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent 50%)' }} />
                                        </div>
                                      ) : (
                                        <div className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center"
                                          style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.08))', border: '1px solid rgba(239,68,68,0.15)' }}>
                                          <Bell className="w-4 h-4 text-red-400" />
                                        </div>
                                      )}

                                      {/* Text */}
                                      <div className="flex-1 min-w-0 py-0.5">
                                        <p className="text-[13px] font-semibold mb-1 leading-tight" style={{ color: notif.is_read ? 'rgba(255,255,255,0.6)' : 'white' }}>
                                          {notif.title}
                                        </p>
                                        <p className="text-[12px] line-clamp-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{notif.message}</p>
                                        <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>{timeAgo(notif.created_at)}</p>
                                      </div>

                                      {!notif.is_read && (
                                        <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                          style={{ background: 'radial-gradient(circle, rgb(239,68,68), rgb(185,28,28))', boxShadow: '0 0 8px rgba(239,68,68,0.7)' }} />
                                      )}
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Footer */}
                            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent)' }} />
                            <button
                              onClick={() => setShowNotifPrefsBell(true)}
                              className="w-full flex items-center justify-center gap-2 py-3.5 text-xs font-medium transition-all"
                              style={{ color: 'rgba(255,255,255,0.25)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
                            >
                              <Settings className="w-3.5 h-3.5" />
                              Préférences d'alertes
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Prefs header */}
                            <div className="relative flex items-center gap-3 px-5 py-4">
                              <button onClick={() => setShowNotifPrefsBell(false)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                style={{ color: 'rgba(255,255,255,0.3)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'white' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}>
                                <ChevronRight className="w-4 h-4 rotate-180" />
                              </button>
                              <p className="font-bold text-white text-[15px]">Préférences</p>
                            </div>
                            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)', margin: '0 20px' }} />
                            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                              {prefConfig.map(pref => {
                                const Icon = pref.icon
                                const enabled = notifPrefs[pref.key as keyof NotifPrefs]
                                return (
                                  <div key={pref.key} className="flex items-center gap-3 p-3.5 rounded-xl transition-all"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pref.color}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
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
                  </AnimatePresence>
                </div>

                {/* Avatar */}
                <button
                  onClick={openProfile}
                  className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/10 hover:ring-white/30 transition-all flex-shrink-0"
                >
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={user.username} width={36} height={36} className="rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-red-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>

                {/* Profile panel */}
                {mounted && createPortal(
                  <AnimatePresence>
                    {showProfile && (
                      <>
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                          onClick={closeProfile}
                        />
                        <motion.div
                          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                          transition={{ type: 'spring', stiffness: 340, damping: 38 }}
                          className="fixed top-0 right-0 bottom-0 w-full md:w-[340px] z-[70] flex flex-col overflow-hidden"
                          style={{ background: '#0e0e0f' }}
                        >
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {avatarUrl && (
                              <div
                                className="absolute inset-0 opacity-20"
                                style={{
                                  backgroundImage: `url(${avatarUrl})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center top',
                                  filter: 'blur(60px) saturate(2)',
                                  transform: 'scale(1.4)',
                                }}
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#0e0e0f]/80 to-[#0e0e0f]" />
                          </div>

                          <div className="relative flex-1 overflow-y-auto overscroll-contain">
                            <div className="px-5 pt-10 pb-6">
                              <div className="flex items-center gap-4">
                                <div className="relative flex-shrink-0">
                                  {avatarUrl ? (
                                    <Image src={avatarUrl} alt={user.username} width={68} height={68} className="rounded-2xl ring-1 ring-white/10" />
                                  ) : (
                                    <div className="w-[68px] h-[68px] rounded-2xl bg-red-600 ring-1 ring-white/10 flex items-center justify-center">
                                      <span className="text-white font-bold text-2xl">{user.username[0].toUpperCase()}</span>
                                    </div>
                                  )}
                                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0e0e0f]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-bold text-lg leading-tight">{user.username}</p>
                                  <p className="text-white/30 text-xs mt-0.5">{user.email || 'Compte Discord'}</p>
                                </div>
                                <button
                                  onClick={closeProfile}
                                  className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/10 flex items-center justify-center transition-colors self-start"
                                >
                                  <X className="w-4 h-4 text-white/50" />
                                </button>
                              </div>
                            </div>

                            <div className="px-4 space-y-2 mb-8">
                              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <button
                                  onClick={() => setShowNotifPrefs(!showNotifPrefs)}
                                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] transition-colors"
                                >
                                  <Settings className="w-4 h-4 text-white/40 flex-shrink-0" />
                                  <span className="text-white/80 text-sm font-medium flex-1 text-left">Gérer les notifications</span>
                                  <motion.div animate={{ rotate: showNotifPrefs ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                                  </motion.div>
                                </button>
                                <AnimatePresence>
                                  {showNotifPrefs && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.22 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="border-t border-white/[0.05] px-4 py-3 space-y-3">
                                        {prefConfig.map(pref => {
                                          const Icon = pref.icon
                                          const enabled = notifPrefs[pref.key as keyof NotifPrefs]
                                          return (
                                            <div key={pref.key} className="flex items-center gap-3">
                                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${pref.color}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                              </div>
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

                              <Link href="/favorites" onClick={closeProfile}
                                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] transition-colors group"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                              >
                                <Heart className="w-4 h-4 text-white/40 flex-shrink-0" />
                                <span className="text-white/80 text-sm font-medium flex-1">Mes favoris</span>
                                <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                              </Link>

                              {user.is_admin && (
                                <Link href="/admin" onClick={closeProfile}
                                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] transition-colors group"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                                >
                                  <Shield className="w-4 h-4 text-white/40 flex-shrink-0" />
                                  <span className="text-white/80 text-sm font-medium flex-1">Administration</span>
                                  <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                                </Link>
                              )}

                              <button
                                onClick={async () => { await fetch('/api/auth/logout'); window.location.href = '/' }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-red-500/[0.08] transition-colors"
                                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}
                              >
                                <LogOut className="w-4 h-4 text-red-400/70 flex-shrink-0" />
                                <span className="text-red-400/80 text-sm font-medium">Déconnexion</span>
                              </button>
                            </div>

                            <div className="px-4 pb-10">
                              <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-3 px-1">Derniers visionnages</p>
                              {loadingHistory ? (
                                <div className="flex justify-center py-10">
                                  <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
                                </div>
                              ) : watchHistory.length === 0 ? (
                                <div className="text-center py-8 text-white/20 text-sm">Aucun visionnage récent</div>
                              ) : (
                                <div className="space-y-2">
                                  {watchHistory.map(item => (
                                    <Link
                                      key={item.id}
                                      href={`/watch/${item.content_type}/${item.content_id}`}
                                      onClick={closeProfile}
                                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.04] transition-colors relative"
                                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                    >
                                      {!item.finished && item.progress > 0 && (
                                        <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                                      )}
                                      <div className="relative w-10 h-[58px] rounded-xl overflow-hidden bg-zinc-800/60 flex-shrink-0">
                                        {item.poster_url ? (
                                          <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="40px" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            {item.content_type === 'movie' ? <Film className="w-4 h-4 text-zinc-600" /> : <Tv className="w-4 h-4 text-zinc-600" />}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <span className={cn(
                                            'inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded',
                                            item.content_type === 'movie' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'
                                          )}>
                                            {item.content_type === 'movie' ? <Film className="w-2 h-2" /> : <Tv className="w-2 h-2" />}
                                            {item.content_type === 'movie' ? 'FILM' : 'SÉRIE'}
                                          </span>
                                          {item.content_type === 'series' && item.season && item.episode && (
                                            <span className="text-[10px] text-white/30 font-medium">
                                              S{String(item.season).padStart(2, '0')}·E{String(item.episode).padStart(2, '0')}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-white/80 text-sm font-semibold truncate leading-tight">{item.title}</p>
                                        <p className="text-white/30 text-xs mt-0.5">
                                          {item.finished
                                            ? <span className="flex items-center gap-1 text-green-400/60"><Check className="w-2.5 h-2.5" />Terminé</span>
                                            : `${item.progress}% · ${timeAgo(item.watched_at)}`
                                          }
                                        </p>
                                      </div>
                                    </Link>
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
              </>
            ) : (
              <Link href="/login">
                <div className="flex items-center gap-2 bg-red-600 hover:bg-red-500 transition-colors px-4 py-2 rounded-full text-white font-semibold text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Connexion
                </div>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/10 transition-all"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden pb-10"
              style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}
            >
              <div className="flex justify-center pt-3 pb-4">
                <div className="w-8 h-1 rounded-full bg-white/15" />
              </div>
              {!user && (
                <div className="px-5 pb-4">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-500 transition-colors px-5 py-3.5 rounded-2xl text-white font-semibold text-sm">
                      Connexion
                    </div>
                  </Link>
                </div>
              )}
              <nav className="px-4 flex flex-col gap-0.5">
                {navLinks.map((link, i) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  return (
                    <motion.div key={link.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-colors',
                          isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                        )}
                      >
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                          isActive ? 'bg-red-600' : 'bg-white/[0.07]'
                        )}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className={cn('font-semibold text-base', isActive ? 'text-white' : 'text-white/50')}>{link.label}</span>
                        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
