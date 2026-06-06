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
import { cn } from '@/lib/utils'
import { useSession } from '@/components/session-provider'
import { useDrawer } from '@/components/movie-drawer'
import { usePresence } from '@/hooks/use-presence'

interface Notification {
  id: string; title: string; message: string; type: string
  image_url: string | null; content_id: number | null
  content_type: string | null; is_read: boolean; created_at: string
}
interface NotifPrefs {
  new_movies: boolean; new_series: boolean; new_episodes: boolean
  request_approved: boolean; request_rejected: boolean; announcements: boolean
}
interface WatchHistory {
  id: string; content_id: number; content_type: 'movie' | 'series'
  title: string; poster_url: string | null; progress: number
  season?: number; episode?: number; finished: boolean; watched_at: string
}

const navLinks = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/movies', label: 'Films', icon: Film },
  { href: '/series', label: 'Séries', icon: Tv },
  { href: '/request', label: "Demande", icon: Plus },
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
    <button onClick={() => onChange(!enabled)} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-red-500' : 'bg-white/20'}`}>
      <motion.div animate={{ x: enabled ? 23 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow" />
    </button>
  )
}

export function Navbar() {
  const { user } = useSession()
  usePresence(user?.id)
  const { openDrawer } = useDrawer()
  const router = useRouter()
  const pathname = usePathname()

  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Search
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const searchRef = useRef<HTMLDivElement>(null)

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false)

  // Notifications
  const [showNotif, setShowNotif] = useState(false)
  const [showNotifPrefs, setShowNotifPrefs] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ new_movies: true, new_series: true, new_episodes: true, request_approved: true, request_rejected: true, announcements: true })
  const notifRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter(n => !n.is_read).length

  // Profile
  const [showProfile, setShowProfile] = useState(false)
  const [showProfileNotifPrefs, setShowProfileNotifPrefs] = useState(false)
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const avatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png` : null

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let ticking = false
    const fn = () => { if (!ticking) { requestAnimationFrame(() => { setIsScrolled(window.scrollY > 20); ticking = false }); ticking = true } }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Lock body scroll when panels open
  useEffect(() => {
    const locked = showProfile || mobileOpen
    if (locked) {
      const y = window.scrollY
      document.body.dataset.scrollY = String(y)
      Object.assign(document.body.style, { position: 'fixed', top: `-${y}px`, left: '0', right: '0', overflow: 'hidden' })
    } else {
      const y = parseInt(document.body.dataset.scrollY || '0')
      Object.assign(document.body.style, { position: '', top: '', left: '', right: '', overflow: '' })
      delete document.body.dataset.scrollY
      window.scrollTo(0, y)
    }
  }, [showProfile, mobileOpen])

  useEffect(() => { if (user) { fetchNotifications(); fetchNotifPrefs() } }, [user])

  // Close notif on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) { setShowNotif(false); setShowNotifPrefs(false) } }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Close search on outside click (desktop)
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) closeSearch() }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const fetchNotifications = async () => {
    if (!user) return
    setLoadingNotifs(true)
    try { const r = await fetch(`/api/notifications?user_id=${user.id}`); const d = await r.json(); setNotifications(Array.isArray(d) ? d : []) } catch {}
    setLoadingNotifs(false)
  }
  const fetchNotifPrefs = async () => {
    if (!user) return
    try { const r = await fetch(`/api/notification-preferences?user_id=${user.id}`); if (r.ok) { const d = await r.json(); if (d) setNotifPrefs(d) } } catch {}
  }
  const fetchWatchHistory = async () => {
    if (!user) return
    setLoadingHistory(true)
    try { const r = await fetch(`/api/watch-history?user_id=${user.id}&limit=5`); if (r.ok) { const d = await r.json(); setWatchHistory(Array.isArray(d) ? d : []) } } catch {}
    setLoadingHistory(false)
  }
  const updatePref = async (key: string, value: boolean) => {
    if (!user) return
    const p = { ...notifPrefs, [key]: value }
    setNotifPrefs(p as NotifPrefs)
    await fetch('/api/notification-preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, ...p }) })
  }
  const markAllRead = async () => {
    if (!user) return
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, mark_all: true }) })
    setNotifications(p => p.map(n => ({ ...n, is_read: true })))
  }
  const clearAll = async () => {
    if (!user) return
    await fetch(`/api/notifications?user_id=${user.id}`, { method: 'DELETE' })
    setNotifications([])
  }

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val)
    if (!val.trim()) { setSearchResults([]); return }
    try {
      const [rm, rs] = await Promise.all([
        fetch(`/api/auth/admin/tmdb-search?q=${encodeURIComponent(val)}&type=movie`),
        fetch(`/api/auth/admin/tmdb-search?q=${encodeURIComponent(val)}&type=tv`),
      ])
      const movies = ((await rm.json()).results || []).slice(0, 3).map((r: any) => ({ ...r, media_type: 'movie' }))
      const series = ((await rs.json()).results || []).slice(0, 3).map((r: any) => ({ ...r, media_type: 'series' }))
      setSearchResults([...movies, ...series].slice(0, 6))
    } catch {}
  }

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]) }

  const selectResult = (result: any) => {
    closeSearch()
    setTimeout(() => openDrawer(result.media_type === 'movie' ? 'movie' : 'series', result.id), 200)
  }

  const openProfile = () => { setShowProfile(true); setShowNotif(false); fetchWatchHistory() }
  const closeProfile = () => { setShowProfile(false); setShowProfileNotifPrefs(false) }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════ DESKTOP NAVBAR ═══════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none hidden md:block pt-4">
        <div className="relative flex items-center h-[56px] px-6">

          {/* Logo */}
          <Link href="/" className="pointer-events-auto flex-shrink-0">
            <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT_Image_27_avr._2026_a%CC%80_00_48_07-removebg-preview-q9gJZZAURjXxiGLwtVf8BsKdJaOxq9.png"
              alt="StreamSelf" width={560} height={168} className="h-14 w-auto" />
          </Link>

          {/* Pill centré */}
          <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2">
            <nav
              className="flex items-center h-[42px] px-1 gap-0.5 rounded-full"
              style={{
                background: isScrolled ? 'rgba(10,5,6,0.7)' : 'rgba(10,5,6,0.25)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: isScrolled ? '0 4px 24px rgba(0,0,0,0.4)' : 'none',
                transition: 'all 0.3s',
              }}
            >
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}>
                  <div className={cn(
                    'px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-150 whitespace-nowrap',
                    pathname === link.href ? 'bg-white text-black' : 'text-white/50 hover:text-white hover:bg-white/8'
                  )}>{link.label}</div>
                </Link>
              ))}

              <div className="w-px h-4 bg-white/10 mx-1" />

              {/* Dé roulette */}
              <Link href="/roulette" title="Roulette">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center transition-all', pathname === '/roulette' ? 'bg-white text-black' : 'text-white/50 hover:text-white hover:bg-white/8')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="4"/>
                    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                  </svg>
                </div>
              </Link>

              <div className="w-px h-4 bg-white/10 mx-1" />

              {/* Search desktop */}
              <div ref={searchRef} className="relative flex items-center">
                <AnimatePresence mode="wait">
                  {searchOpen ? (
                    <motion.div key="open" initial={{ width: 32, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 32, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="flex items-center gap-2 px-3 h-8 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                    >
                      <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                      <input value={searchQuery} onChange={e => handleSearchChange(e.target.value)}
                        onKeyDown={e => e.key === 'Escape' && closeSearch()}
                        placeholder="Rechercher..." autoFocus
                        className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/25" />
                      {searchQuery && (
                        <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
                          <X className="w-3 h-3 text-white/30 hover:text-white/70" />
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.button key="closed" onClick={() => setSearchOpen(true)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all">
                      <Search className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Dropdown résultats desktop */}
                <AnimatePresence>
                  {searchOpen && searchResults.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
                      className="absolute top-11 left-1/2 -translate-x-1/2 w-[340px] rounded-2xl overflow-hidden z-50 shadow-2xl"
                      style={{ background: 'rgba(10,5,6,0.97)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {searchResults.map((r, i) => {
                        const title = r.title || r.name || ''
                        const year = (r.release_date || r.first_air_date || '').slice(0, 4)
                        const isMovie = r.media_type === 'movie'
                        const poster = r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : null
                        return (
                          <button key={`${r.media_type}-${r.id}`} onClick={() => selectResult(r)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                            style={{ borderBottom: i < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                          >
                            <div className="relative w-8 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                              {poster ? <Image src={poster} alt={title} fill className="object-cover" sizes="32px" /> : <div className="w-full h-full bg-zinc-700" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-[13px] truncate">{title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', isMovie ? 'bg-blue-500/15 text-blue-300' : 'bg-purple-500/15 text-purple-300')}>
                                  {isMovie ? 'FILM' : 'SÉRIE'}
                                </span>
                                {year && <span className="text-white/25 text-xs">{year}</span>}
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>
          </div>

          {/* Droite — Bell + Avatar */}
          <div className="pointer-events-auto ml-auto flex items-center gap-2">
            {user ? (
              <>
                {/* Bell */}
                <div ref={notifRef} className="relative">
                  <button onClick={() => { setShowNotif(v => !v); setShowProfile(false); if (!showNotif) fetchNotifications() }}
                    className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all text-white/50 hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                  </button>

                  {/* Notif panel */}
                  <AnimatePresence>
                    {(showNotif || showNotifPrefs) && (
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="absolute right-0 top-12 w-[360px] rounded-2xl overflow-hidden z-50"
                        style={{ background: 'rgba(10,5,6,0.97)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}
                      >
                        {!showNotifPrefs ? (
                          <>
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                              <p className="font-bold text-white text-[15px]">Notifications</p>
                              <div className="flex items-center gap-1">
                                {unreadCount > 0 && <button onClick={markAllRead} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-green-400 hover:bg-green-400/10 transition-all"><Check className="w-3.5 h-3.5" /></button>}
                                {notifications.length > 0 && <button onClick={clearAll} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>}
                                <button onClick={() => setShowNotif(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
                              {loadingNotifs ? (
                                <div className="flex justify-center py-12"><div className="w-5 h-5 rounded-full border-2 border-red-500/20 border-t-red-500/70 animate-spin" /></div>
                              ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                  <Bell className="w-8 h-8 text-white/10" />
                                  <p className="text-white/25 text-sm">Aucune notification</p>
                                </div>
                              ) : notifications.map((n, i) => (
                                <button key={n.id} onClick={async () => {
                                  await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notification_id: n.id, user_id: user.id }) })
                                  setNotifications(p => p.map(x => x.id === n.id ? { ...x, is_read: true } : x))
                                  if (n.content_id && n.content_type) { setShowNotif(false); router.push(`/watch/${n.content_type}/${n.content_id}`) }
                                }} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left relative"
                                  style={{ borderBottom: i < notifications.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: n.is_read ? 'transparent' : 'rgba(239,68,68,0.04)' }}>
                                  {!n.is_read && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-red-500" />}
                                  {n.image_url ? (
                                    <div className="relative w-10 h-14 rounded-xl overflow-hidden shrink-0"><Image src={n.image_url} alt="" fill className="object-cover" sizes="40px" /></div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-500/10"><Bell className="w-4 h-4 text-red-400" /></div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold truncate" style={{ color: n.is_read ? 'rgba(255,255,255,0.55)' : 'white' }}>{n.title}</p>
                                    <p className="text-[11px] text-white/30 line-clamp-2 mt-0.5">{n.message}</p>
                                    <p className="text-[10px] text-white/20 mt-1">{timeAgo(n.created_at)}</p>
                                  </div>
                                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setShowNotifPrefs(true)} className="w-full flex items-center justify-center gap-2 py-3 text-xs font-medium text-white/25 hover:text-white/50 hover:bg-white/[0.02] transition-all border-t border-white/[0.06]">
                              <Settings className="w-3.5 h-3.5" /> Préférences
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
                              <button onClick={() => setShowNotifPrefs(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                              <p className="font-bold text-white text-[15px]">Préférences</p>
                            </div>
                            <div className="p-4 space-y-2">
                              {prefConfig.map(pref => {
                                const Icon = pref.icon
                                return (
                                  <div key={pref.key} className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${pref.color}`}><Icon className="w-3.5 h-3.5" /></div>
                                    <p className="text-white/70 text-sm flex-1">{pref.label}</p>
                                    <Toggle enabled={notifPrefs[pref.key as keyof NotifPrefs]} onChange={v => updatePref(pref.key, v)} />
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

                {/* Avatar pill */}
                <button onClick={openProfile}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                    {avatarUrl ? <Image src={avatarUrl} alt={user.username} width={28} height={28} className="object-cover" /> : <div className="w-full h-full bg-red-600 flex items-center justify-center"><User className="w-3 h-3 text-white" /></div>}
                  </div>
                  <span className="text-white text-[12px] font-semibold">{user.username}</span>
                  <ChevronRight className="w-3 h-3 text-white/25" />
                </button>
              </>
            ) : (
              <Link href="/login">
                <div className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 transition-colors px-4 py-2 rounded-full text-white font-semibold text-[13px]">
                  Connexion
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════ MOBILE NAVBAR ═══════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 md:hidden"
        style={{ background: isScrolled ? 'rgba(10,5,6,0.85)' : 'transparent', backdropFilter: isScrolled ? 'blur(20px)' : 'none', transition: 'all 0.3s', borderBottom: isScrolled ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        <div className="flex items-center justify-between px-4 h-[60px]">
          {/* Logo */}
          <Link href="/">
            <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT_Image_27_avr._2026_a%CC%80_00_48_07-removebg-preview-q9gJZZAURjXxiGLwtVf8BsKdJaOxq9.png"
              alt="StreamSelf" width={560} height={168} className="h-10 w-auto" />
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Search className="w-4 h-4" />
            </button>
            {user && (
              <button onClick={() => { setShowNotif(v => !v); if (!showNotif) fetchNotifications() }}
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
            )}
            <button onClick={() => setMobileOpen(v => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════ PORTALS ═══════════════════ */}
      {mounted && createPortal(
        <>
          {/* Search overlay — full screen, desktop + mobile */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[200] flex flex-col"
                style={{ background: 'rgba(8,3,5,0.97)', backdropFilter: 'blur(40px)' }}>

                {/* Barre */}
                <div className="flex items-center gap-3 px-4 pt-12 pb-4 md:pt-6 md:max-w-xl md:mx-auto md:w-full">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Search className="w-4 h-4 text-white/30 shrink-0" />
                    <input value={searchQuery} onChange={e => handleSearchChange(e.target.value)}
                      onKeyDown={e => e.key === 'Escape' && closeSearch()}
                      placeholder="Films, séries, animés..." autoFocus
                      className="bg-transparent text-white text-[15px] outline-none flex-1 placeholder-white/25 font-medium" />
                    {searchQuery && (
                      <button onPointerDown={() => { setSearchQuery(''); setSearchResults([]) }}
                        className="w-5 h-5 rounded-full flex items-center justify-center bg-white/15">
                        <X className="w-3 h-3 text-white/70" />
                      </button>
                    )}
                  </div>
                  <button onPointerDown={closeSearch} className="text-white/50 text-[15px] font-semibold shrink-0 hover:text-white transition-colors">
                    Annuler
                  </button>
                </div>

                {/* Résultats */}
                <div className="flex-1 overflow-y-auto px-4 md:max-w-xl md:mx-auto md:w-full">
                  {!searchQuery && (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                      <Search className="w-10 h-10 text-white/10" />
                      <p className="text-white/20 text-sm">Recherchez un film ou une série</p>
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {searchResults.map((r, i) => {
                        const title = r.title || r.name || ''
                        const isMovie = r.media_type === 'movie'
                        const poster = r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : null
                        const year = (r.release_date || r.first_air_date || '').slice(0, 4)
                        return (
                          <div key={`${r.media_type}-${r.id}`}
                            onPointerDown={(e) => { const y0 = e.clientY; const el = e.currentTarget; const up = (ev: PointerEvent) => { if (Math.abs(ev.clientY - y0) < 8) selectResult(r); el.removeEventListener('pointerup', up as any) }; el.addEventListener('pointerup', up as any) }}
                            className="flex items-center gap-4 px-4 py-3.5 active:bg-white/[0.05] cursor-pointer select-none"
                            style={{ borderBottom: i < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <div className="relative w-10 h-[58px] rounded-xl overflow-hidden shrink-0 bg-white/5">
                              {poster ? <Image src={poster} alt={title} fill className="object-cover" sizes="40px" /> : null}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-[14px] truncate">{title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', isMovie ? 'bg-blue-500/15 text-blue-300' : 'bg-purple-500/15 text-purple-300')}>
                                  {isMovie ? 'FILM' : 'SÉRIE'}
                                </span>
                                {year && <span className="text-white/25 text-xs">{year}</span>}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/15 shrink-0" />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile bottom sheet */}
          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="md:hidden fixed inset-0 z-[95]"
                  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                  onClick={() => setMobileOpen(false)} />
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                  className="md:hidden fixed bottom-0 left-0 right-0 z-[96] rounded-t-3xl overflow-hidden"
                  style={{ background: 'rgba(12,8,9,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', backdropFilter: 'blur(40px)', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
                  onClick={e => e.stopPropagation()}>

                  {/* Handle */}
                  <div className="flex justify-center pt-3 pb-1"><div className="w-8 h-1 rounded-full bg-white/15" /></div>

                  {/* User card */}
                  {user ? (
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="relative shrink-0">
                          {avatarUrl ? <Image src={avatarUrl} alt={user.username} width={40} height={40} className="rounded-xl object-cover" />
                            : <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center"><span className="text-white font-bold">{user.username[0].toUpperCase()}</span></div>}
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0c0809]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">{user.username}</p>
                          <p className="text-white/35 text-xs truncate">{user.email || 'Compte Discord'}</p>
                        </div>
                        <button onClick={async () => { await fetch('/api/auth/logout'); window.location.href = '/' }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <LogOut className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3">
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        <div className="flex items-center justify-center gap-2 w-full bg-red-600 px-5 py-3.5 rounded-2xl text-white font-bold text-sm">Connexion</div>
                      </Link>
                    </div>
                  )}

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 16px 8px' }} />

                  {/* Nav */}
                  <nav className="px-4 pb-4 flex flex-col gap-1">
                    {[...navLinks, ...(user ? [{ href: '/favorites', label: 'Favoris', icon: Heart }, { href: '/roulette', label: 'Roulette', icon: Shuffle }] : [])].map((link, i) => {
                      const Icon = link.icon
                      const active = pathname === link.href
                      return (
                        <motion.div key={link.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <Link href={link.href} onClick={() => setMobileOpen(false)}
                            className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors', active ? 'bg-white/8' : 'active:bg-white/5')}>
                            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', active ? 'bg-red-600' : 'bg-white/7')}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <span className={cn('font-semibold text-base', active ? 'text-white' : 'text-white/45')}>{link.label}</span>
                            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
                          </Link>
                        </motion.div>
                      )
                    })}
                    {user?.is_admin && (
                      <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl active:bg-white/5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/7"><Shield className="w-4 h-4 text-white" /></div>
                        <span className="font-semibold text-base text-white/45">Administration</span>
                      </Link>
                    )}
                  </nav>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Profile panel */}
          <AnimatePresence>
            {showProfile && user && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[160]" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }} onClick={closeProfile} />
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 340, damping: 38 }}
                  className="fixed top-0 right-0 bottom-0 w-full md:w-[340px] z-[170] flex flex-col overflow-hidden"
                  style={{ background: '#0d0709' }}>
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {avatarUrl && <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(60px) saturate(2)', transform: 'scale(1.4)' }} />}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-[#0d0709]/80 to-[#0d0709]" />
                  </div>
                  <div className="relative flex-1 overflow-y-auto overscroll-contain">
                    <div className="px-5 pt-10 pb-5">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          {avatarUrl ? <Image src={avatarUrl} alt={user.username} width={64} height={64} className="rounded-2xl ring-1 ring-white/10" />
                            : <div className="w-16 h-16 rounded-2xl bg-red-600 ring-1 ring-white/10 flex items-center justify-center"><span className="text-white font-bold text-2xl">{user.username[0].toUpperCase()}</span></div>}
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0d0709]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-lg leading-tight">{user.username}</p>
                          <p className="text-white/30 text-xs mt-0.5">{user.email || 'Compte Discord'}</p>
                        </div>
                        <button onClick={closeProfile} className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/10 flex items-center justify-center transition-colors self-start">
                          <X className="w-4 h-4 text-white/50" />
                        </button>
                      </div>
                    </div>

                    <div className="px-4 space-y-2 mb-6">
                      <Link href="/favorites" onClick={closeProfile} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <Heart className="w-4 h-4 text-white/40 shrink-0" />
                        <span className="text-white/80 text-sm font-medium flex-1">Mes favoris</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                      </Link>
                      {user.is_admin && (
                        <Link href="/admin" onClick={closeProfile} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <Shield className="w-4 h-4 text-white/40 shrink-0" />
                          <span className="text-white/80 text-sm font-medium flex-1">Administration</span>
                          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                        </Link>
                      )}
                      <button onClick={async () => { await fetch('/api/auth/logout'); window.location.href = '/' }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-red-500/[0.08] transition-colors"
                        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                        <LogOut className="w-4 h-4 text-red-400/70 shrink-0" />
                        <span className="text-red-400/80 text-sm font-medium">Déconnexion</span>
                      </button>
                    </div>

                    <div className="px-4 pb-10">
                      <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-3 px-1">Derniers visionnages</p>
                      {loadingHistory ? (
                        <div className="flex justify-center py-8"><div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" /></div>
                      ) : watchHistory.length === 0 ? (
                        <p className="text-center py-8 text-white/20 text-sm">Aucun visionnage récent</p>
                      ) : watchHistory.map(item => (
                        <Link key={item.id} href={`/watch/${item.content_type}/${item.content_id}`} onClick={closeProfile}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.04] transition-colors mb-2 relative"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="relative w-10 h-[58px] rounded-xl overflow-hidden bg-zinc-800/60 shrink-0">
                            {item.poster_url ? <Image src={item.poster_url} alt={item.title} fill className="object-cover" sizes="40px" /> : <div className="w-full h-full flex items-center justify-center">{item.content_type === 'movie' ? <Film className="w-4 h-4 text-zinc-600" /> : <Tv className="w-4 h-4 text-zinc-600" />}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 text-sm font-semibold truncate">{item.title}</p>
                            <p className="text-white/30 text-xs mt-0.5">{item.finished ? 'Terminé' : `${item.progress}%`}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Notif mobile portal */}
          <AnimatePresence>
            {showNotif && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="md:hidden fixed z-[150] overflow-hidden rounded-2xl"
                style={{ top: 72, right: 16, left: 16, maxHeight: 420, background: 'rgba(10,5,6,0.97)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.8)' }}>
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
                  <p className="font-bold text-white">Notifications</p>
                  <button onClick={() => setShowNotif(false)} className="w-7 h-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
                  {loadingNotifs ? (
                    <div className="flex justify-center py-10"><div className="w-5 h-5 rounded-full border-2 border-red-500/20 border-t-red-500/70 animate-spin" /></div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2"><Bell className="w-7 h-7 text-white/10" /><p className="text-white/25 text-sm">Aucune notification</p></div>
                  ) : notifications.map((n, i) => (
                    <button key={n.id} onClick={async () => {
                      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notification_id: n.id, user_id: user?.id }) })
                      setNotifications(p => p.map(x => x.id === n.id ? { ...x, is_read: true } : x))
                      if (n.content_id && n.content_type) { setShowNotif(false); router.push(`/watch/${n.content_type}/${n.content_id}`) }
                    }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/5"
                      style={{ borderBottom: i < notifications.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      {n.image_url ? <div className="relative w-9 h-12 rounded-xl overflow-hidden shrink-0"><Image src={n.image_url} alt="" fill className="object-cover" sizes="36px" /></div>
                        : <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-500/10"><Bell className="w-3.5 h-3.5 text-red-400" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white/80 truncate">{n.title}</p>
                        <p className="text-[11px] text-white/30 line-clamp-1 mt-0.5">{n.message}</p>
                      </div>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  )
}
