'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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

  // Block body scroll when profile panel or mobile menu is open (iOS-safe)
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
      className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'bg-background/95 backdrop-blur-md shadow-lg border-b border-border/50' : 'bg-gradient-to-b from-background/80 to-transparent'
      )}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/10 z-10">
        <motion.div
          className="h-full bg-gradient-to-r from-red-800 via-red-600 to-red-500 shadow-[0_0_10px_rgba(220,38,38,0.8)]"
          style={{ width: `${scrollProgress}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 0.3 }}
        />
      </div>

      <div className="w-full px-6">
        <div className="flex items-center h-16 gap-6">
          <Link href="/" className="flex-shrink-0">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT_Image_27_avr._2026_a%CC%80_00_48_07-removebg-preview-q9gJZZAURjXxiGLwtVf8BsKdJaOxq9.png"
              alt="StreamSelf" width={240} height={72} className="h-14 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <Link key={link.href} href={link.href}>
                  <div className={cn(
                    'relative px-6 py-2 rounded-full text-xs font-semibold transition-colors duration-150 cursor-pointer select-none',
                    isActive
                      ? 'bg-zinc-800/60 text-white'
                      : 'text-zinc-500 hover:text-white'
                  )}>
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
                        style={{ background: 'linear-gradient(to right, #f97316, #ef4444)', bottom: '4px' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div ref={searchRef} className="relative">
              <AnimatePresence>
                {isSearchOpen ? (
                  <motion.form initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                    onSubmit={handleSearch} className="relative">
                    <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 gap-2 w-64">
                      <Search className="w-4 h-4 text-white/40 shrink-0" />
                      <input
                        value={searchQuery}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Rechercher..."
                        className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/30"
                        autoFocus
                      />
                      {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]) }}><X className="w-4 h-4 text-white/40 hover:text-white" /></button>}
                    </div>
                  </motion.form>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} className="text-muted-foreground hover:text-foreground">
                    <Search className="w-5 h-5" />
                  </Button>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {isSearchOpen && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-12 w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50"
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
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                        >
                          <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                            {poster ? <Image src={poster} alt={title} fill className="object-cover" sizes="40px" /> : <div className="w-full h-full bg-zinc-700" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-primary font-semibold text-sm truncate">{title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs bg-zinc-700 text-white/70 px-2 py-0.5 rounded font-medium">{isMovie ? 'FILM' : 'SÉRIE'}</span>
                              {year && <span className="text-white/40 text-xs">{year}</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/30" />
                        </Link>
                      )
                    })}
                    <div className="px-4 py-2 text-white/30 text-xs border-t border-zinc-800">
                      {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {user ? (
              <>
                {/* Bell */}
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowNotifPrefsBell(false); if (!showNotifications) fetchNotifications() }}
                    className="relative p-2 rounded-full hover:bg-secondary transition-colors"
                  >
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {(showNotifications || showNotifPrefsBell) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-12 w-80 md:w-96 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                      >
                        {!showNotifPrefsBell ? (
                          <>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                                  <Bell className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-bold text-white text-sm">Notifications</p>
                                  {unreadCount > 0 && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">{unreadCount} nouvelles</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                  <button onClick={markAllRead} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Tout lu">
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                                {notifications.length > 0 && (
                                  <button onClick={clearAll} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Vider">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => setShowNotifications(false)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                              {loadingNotifs ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                              ) : notifications.length === 0 ? (
                                <div className="text-center py-10">
                                  <Bell className="w-8 h-8 text-white/20 mx-auto mb-2" />
                                  <p className="text-white/40 text-sm">Aucune notification</p>
                                </div>
                              ) : (
                                notifications.map(notif => (
                                  <div key={notif.id}
                                    className={cn('flex gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer',
                                      !notif.is_read && 'border-l-2 border-l-primary bg-primary/5')}
                                    onClick={async () => {
                                      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notification_id: notif.id, user_id: user.id }) })
                                      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
                                      if (notif.content_id && notif.content_type) { setShowNotifications(false); router.push(`/watch/${notif.content_type}/${notif.content_id}`) }
                                    }}
                                  >
                                    {notif.image_url ? (
                                      <div className="relative w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden">
                                        <Image src={notif.image_url} alt="" fill className="object-cover" sizes="40px" />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Bell className="w-4 h-4 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white text-xs font-semibold mb-0.5">{notif.title}</p>
                                      <p className="text-white/50 text-xs line-clamp-2">{notif.message}</p>
                                      <p className="text-white/30 text-xs mt-1">{timeAgo(notif.created_at)}</p>
                                    </div>
                                    {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />}
                                  </div>
                                ))
                              )}
                            </div>
                            <button
                              onClick={() => setShowNotifPrefsBell(true)}
                              className="w-full flex items-center justify-center gap-2 py-3 text-white/40 hover:text-white/70 text-xs border-t border-white/10 hover:bg-white/5 transition-colors"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              Préférences d'alertes
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                              <button onClick={() => setShowNotifPrefsBell(false)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                                <ChevronRight className="w-4 h-4 rotate-180" />
                              </button>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                                  <Bell className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-bold text-white text-sm">Préférences</p>
                                  <p className="text-white/40 text-xs">Choisis ce que tu veux recevoir</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
                              {prefConfig.map(pref => {
                                const Icon = pref.icon
                                const enabled = notifPrefs[pref.key as keyof NotifPrefs]
                                return (
                                  <div key={pref.key} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${pref.color}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <p className="text-white text-sm font-medium flex-1">{pref.label}</p>
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

                {/* Profile button */}
                <button
                  onClick={openProfile}
                  className="flex items-center gap-2 p-1 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={user.username} width={36} height={36} className="rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                </button>

                {/* ── PROFILE PANEL ── */}
                {mounted && createPortal(
                <AnimatePresence>
                  {showProfile && (
                    <>
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/70 z-[60]"
                        onClick={closeProfile}
                      />

                      {/* Side panel */}
                      <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 340, damping: 38 }}
                        className="fixed top-0 right-0 bottom-0 w-full md:w-[340px] z-[70] flex flex-col overflow-hidden"
                        style={{ background: '#111' }}
                      >
                        {/* Blurred background from avatar */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          {avatarUrl && (
                            <div
                              className="absolute inset-0 opacity-25"
                              style={{
                                backgroundImage: `url(${avatarUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center top',
                                filter: 'blur(60px) saturate(2)',
                                transform: 'scale(1.4)',
                              }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-[#111]/70 to-[#111]" />
                        </div>

                        {/* Scrollable body */}
                        <div className="relative flex-1 overflow-y-auto overscroll-contain">

                          {/* ── User header ── */}
                          <div className="px-5 pt-10 pb-6">
                            <div className="flex items-center gap-4">
                              <div className="relative flex-shrink-0">
                                {avatarUrl ? (
                                  <Image src={avatarUrl} alt={user.username} width={70} height={70} className="rounded-full ring-2 ring-white/10" />
                                ) : (
                                  <div className="w-[70px] h-[70px] rounded-full bg-primary ring-2 ring-white/10 flex items-center justify-center">
                                    <span className="text-white font-bold text-3xl">{user.username[0].toUpperCase()}</span>
                                  </div>
                                )}
                                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#111]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-xl leading-tight">{user.username}</p>
                                <p className="text-white/40 text-sm mt-0.5">{user.email || 'Compte Discord'}</p>
                              </div>
                              <button
                                onClick={closeProfile}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0 self-start mt-1"
                              >
                                <ChevronRight className="w-5 h-5 text-white/70" />
                              </button>
                            </div>
                          </div>

                          {/* ── Menu ── */}
                          <div className="px-4 space-y-2 mb-8">

                            {/* Gérer les notifications */}
                            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <button
                                onClick={() => setShowNotifPrefs(!showNotifPrefs)}
                                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 transition-colors"
                              >
                                <Settings className="w-[18px] h-[18px] text-white/60 flex-shrink-0" />
                                <span className="text-white/90 text-sm font-medium flex-1 text-left">Gérer les notifications</span>
                                <motion.div animate={{ rotate: showNotifPrefs ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                  <ChevronRight className="w-4 h-4 text-white/30" />
                                </motion.div>
                              </button>

                              <AnimatePresence>
                                {showNotifPrefs && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="border-t border-white/5 px-4 py-3 space-y-3">
                                      {prefConfig.map(pref => {
                                        const Icon = pref.icon
                                        const enabled = notifPrefs[pref.key as keyof NotifPrefs]
                                        return (
                                          <div key={pref.key} className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${pref.color}`}>
                                              <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <p className="text-white/70 text-xs font-medium flex-1">{pref.label}</p>
                                            <Toggle enabled={enabled} onChange={v => updatePref(pref.key, v)} />
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Mes favoris */}
                            <Link href="/favorites" onClick={closeProfile}
                              className="flex items-center gap-3 px-4 py-4 rounded-2xl hover:bg-white/5 transition-colors group"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                              <Heart className="w-[18px] h-[18px] text-white/60 flex-shrink-0" />
                              <span className="text-white/90 text-sm font-medium flex-1">Mes favoris</span>
                              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                            </Link>

                            {/* Administration */}
                            {user.is_admin && (
                              <Link href="/admin" onClick={closeProfile}
                                className="flex items-center gap-3 px-4 py-4 rounded-2xl hover:bg-white/5 transition-colors group"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                              >
                                <Shield className="w-[18px] h-[18px] text-white/60 flex-shrink-0" />
                                <span className="text-white/90 text-sm font-medium flex-1">Administration</span>
                                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                              </Link>
                            )}

                            {/* Déconnexion */}
                            <button
                              onClick={async () => { await fetch('/api/auth/logout'); window.location.href = '/' }}
                              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl hover:bg-red-500/10 transition-colors"
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                            >
                              <LogOut className="w-[18px] h-[18px] text-red-400 flex-shrink-0" />
                              <span className="text-red-400 text-sm font-medium">Déconnexion</span>
                            </button>
                          </div>

                          {/* ── Derniers visionnages ── */}
                          <div className="px-4 pb-10">
                            <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest mb-3 px-1">Derniers visionnages</p>

                            {loadingHistory ? (
                              <div className="flex justify-center py-10">
                                <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                              </div>
                            ) : watchHistory.length === 0 ? (
                              <div className="text-center py-10 text-white/25 text-sm">
                                Aucun visionnage récent
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {watchHistory.map(item => (
                                  <Link
                                    key={item.id}
                                    href={`/watch/${item.content_type}/${item.content_id}`}
                                    onClick={closeProfile}
                                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors group relative"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                                  >
                                    {/* Red dot top-right (like the screenshot) */}
                                    {!item.finished && item.progress > 0 && (
                                      <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full" />
                                    )}

                                    {/* Poster */}
                                    <div className="relative w-12 h-[68px] rounded-xl overflow-hidden bg-zinc-800/80 flex-shrink-0">
                                      {item.poster_url ? (
                                        <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="48px" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          {item.content_type === 'movie'
                                            ? <Film className="w-5 h-5 text-zinc-600" />
                                            : <Tv className="w-5 h-5 text-zinc-600" />
                                          }
                                        </div>
                                      )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 pr-4">
                                      {/* Type + episode badge */}
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <span className={cn(
                                          'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded',
                                          item.content_type === 'movie'
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-blue-500/20 text-blue-400'
                                        )}>
                                          {item.content_type === 'movie' ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
                                          {item.content_type === 'movie' ? 'FILM' : 'SÉRIE'}
                                        </span>
                                        {item.content_type === 'series' && item.season && item.episode && (
                                          <span className="text-[10px] text-white/40 font-medium">
                                            S{String(item.season).padStart(2, '0')}·E{String(item.episode).padStart(2, '0')}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-white/90 text-sm font-semibold truncate leading-tight">{item.title}</p>
                                      <p className="text-white/40 text-xs mt-0.5">
                                        {item.finished
                                          ? <span className="flex items-center gap-1 text-green-400/80"><Check className="w-3 h-3" />Terminé</span>
                                          : `${item.progress}%  ·  ${timeAgo(item.watched_at)}`
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
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 bg-primary rounded-full blur-md opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="relative flex items-center gap-2 bg-primary hover:bg-primary/90 transition-colors px-5 py-2.5 rounded-full text-white font-bold text-sm shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Connexion
                  </div>
                </div>
              </Link>
            )}

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl overflow-hidden pb-8"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              {!user && (
                <div className="px-5 pt-2 pb-4">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex items-center justify-center gap-3 w-full bg-primary hover:bg-primary/90 transition-colors px-5 py-4 rounded-2xl text-white font-bold text-base shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                        <polyline points="10 17 15 12 10 7"/>
                        <line x1="15" y1="12" x2="3" y2="12"/>
                      </svg>
                      Se connecter
                    </div>
                  </Link>
                </div>
              )}
              <nav className="px-5 flex flex-col gap-1">
                {navLinks.map((link, i) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  const isHighlight = 'highlight' in link && link.highlight
                  return (
                    <motion.div key={link.href} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link href={link.href} onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-4 px-2 py-4 rounded-2xl transition-colors">
                        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', isActive ? 'bg-primary' : isHighlight ? 'bg-gradient-to-br from-red-700 to-red-500' : 'bg-zinc-800')}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className={cn('font-semibold text-lg', isActive ? 'text-white' : isHighlight ? 'text-red-400' : 'text-zinc-400')}>{link.label}</span>
                        {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
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
