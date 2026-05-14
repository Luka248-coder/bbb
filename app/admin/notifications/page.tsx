'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Send, Users, User, Film, Tv, Megaphone,
  Loader2, CheckCircle, Search, X, Clock, Trash2,
  Sparkles, ChevronDown, AlertTriangle, Info, Zap,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */
interface UserItem { id: string; username: string; avatar: string | null; discord_id: string; email: string | null }
interface SentNotif  { id: string; title: string; message: string; type: string; created_at: string; recipients: number }

/* ─── Templates ─────────────────────────────────────────────── */
const TEMPLATES = [
  { label: 'Nouveau film',    icon: Film,       color: '#3b82f6', title: "Nouveau film disponible !",    message: 'Un nouveau film vient d\'être ajouté au catalogue. Découvrez-le maintenant !' },
  { label: 'Nouvelle série',  icon: Tv,         color: '#8b5cf6', title: "Nouvelle série disponible !",  message: 'Une nouvelle série vient d\'être ajoutée. Ne manquez pas le premier épisode !' },
  { label: 'Maintenance',     icon: AlertTriangle, color: '#f59e0b', title: "Maintenance prévue",           message: 'Le site sera en maintenance cette nuit de 2h à 4h. Merci de votre compréhension.' },
  { label: 'Annonce',         icon: Megaphone,   color: '#ef4444', title: "Annonce importante",           message: '' },
  { label: 'Nouveauté',       icon: Sparkles,    color: '#10b981', title: "Nouvelle fonctionnalité !",    message: 'Une nouvelle fonctionnalité vient d\'être déployée sur la plateforme.' },
  { label: 'Info',            icon: Info,        color: '#06b6d4', title: "Information",                 message: '' },
]

const TYPE_OPTIONS = [
  { value: 'announcement', label: 'Annonce',     color: '#ef4444' },
  { value: 'new_content',  label: 'Contenu',     color: '#3b82f6' },
  { value: 'maintenance',  label: 'Maintenance', color: '#f59e0b' },
  { value: 'info',         label: 'Info',        color: '#06b6d4' },
]

/* ─── Character counter ──────────────────────────────────────── */
function CharBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(value / max, 1)
  const color = pct > 0.9 ? '#ef4444' : pct > 0.7 ? '#f59e0b' : '#10b981'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>{value}/{max}</span>
    </div>
  )
}

/* ─── Notification preview card ─────────────────────────────── */
function Preview({ title, message, type }: { title: string; message: string; type: string }) {
  const typeConf = TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[0]
  return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 shadow-2xl max-w-xs">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: typeConf.color + '22', border: `1px solid ${typeConf.color}44` }}>
          <Bell className="w-5 h-5" style={{ color: typeConf.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-white text-sm font-semibold truncate">{title || 'Titre de la notification'}</p>
          </div>
          <p className="text-white/50 text-xs line-clamp-2">{message || 'Contenu de la notification...'}</p>
          <p className="text-white/25 text-[10px] mt-1.5 flex items-center gap-1"><Clock className="w-3 h-3" />À l'instant</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function AdminNotificationsPage() {
  const [title, setTitle]       = useState('')
  const [message, setMessage]   = useState('')
  const [target, setTarget]     = useState<'all' | 'specific'>('all')
  const [type, setType]         = useState('announcement')
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState('')

  // User search
  const [userSearch, setUserSearch]     = useState('')
  const [userResults, setUserResults]   = useState<UserItem[]>([])
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [searching, setSearching]       = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // History
  const [history, setHistory]   = useState<SentNotif[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    loadStats()
    // Close dropdown on outside click
    const fn = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const loadStats = async () => {
    try {
      // Fetch total users count
      const usersRes = await fetch('/api/auth/admin/users')
      if (usersRes.ok) {
        const users = await usersRes.json()
        setTotalUsers(Array.isArray(users) ? users.length : 0)
      }
    } catch {}
    setLoadingHistory(false)
  }

  const searchUsers = async (q: string) => {
    setUserSearch(q)
    if (q.length < 2) { setUserResults([]); setShowDropdown(false); return }
    setSearching(true)
    try {
      const res = await fetch('/api/auth/admin/users')
      if (res.ok) {
        const all: UserItem[] = await res.json()
        const filtered = all.filter(u =>
          u.username?.toLowerCase().includes(q.toLowerCase()) ||
          u.email?.toLowerCase().includes(q.toLowerCase())
        ).slice(0, 6)
        setUserResults(filtered)
        setShowDropdown(true)
      }
    } catch {}
    setSearching(false)
  }

  const selectUser = (u: UserItem) => {
    setSelectedUser(u)
    setUserSearch(u.username)
    setShowDropdown(false)
  }

  const send = async () => {
    if (!title.trim() || !message.trim()) { setError('Titre et message requis'); return }
    if (target === 'specific' && !selectedUser) { setError('Sélectionne un utilisateur'); return }
    setError('')
    setSending(true)
    try {
      await fetch('/api/auth/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, message, type,
          user_id: target === 'specific' ? selectedUser!.id : undefined,
        }),
      })
      setSent(true)
      // Add to local history
      setHistory(prev => [{
        id: Date.now().toString(),
        title, message, type,
        created_at: new Date().toISOString(),
        recipients: target === 'specific' ? 1 : totalUsers,
      }, ...prev].slice(0, 10))
      setTitle(''); setMessage(''); setSelectedUser(null); setUserSearch('')
      setTimeout(() => setSent(false), 4000)
    } catch { setError('Erreur lors de l\'envoi') }
    setSending(false)
  }

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35 },
  })

  return (
    <div className="p-6 md:p-8 min-h-screen">

      {/* ── Header ── */}
      <motion.div {...fade(0)} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-white/40 text-sm">Diffuser des annonces à {loadingHistory ? '...' : totalUsers} utilisateurs</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── LEFT: Compose ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Templates */}
          <motion.div {...fade(0.04)} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-white font-semibold mb-1 text-sm">Modèles rapides</p>
            <p className="text-white/30 text-xs mb-4">Cliquez pour pré-remplir</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.label}
                    onClick={() => { setTitle(t.title); setMessage(t.message) }}
                    className="flex items-center gap-2.5 p-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-white/20 rounded-xl text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all" style={{ backgroundColor: t.color + '20', border: `1px solid ${t.color}30` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: t.color }} />
                    </div>
                    <span className="text-white/70 text-xs font-medium group-hover:text-white transition-colors">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Compose form */}
          <motion.div {...fade(0.08)} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              <p className="text-white font-semibold text-sm">Composer</p>
            </div>

            {/* Target */}
            <div>
              <label className="text-white/50 text-xs font-medium block mb-2">Destinataires</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setTarget('all'); setSelectedUser(null); setUserSearch('') }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                    target === 'all' ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white hover:border-white/20'
                  }`}>
                  <Users className="w-4 h-4" />
                  Tous ({totalUsers})
                </button>
                <button onClick={() => setTarget('specific')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                    target === 'specific' ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white hover:border-white/20'
                  }`}>
                  <User className="w-4 h-4" />
                  Utilisateur ciblé
                </button>
              </div>
            </div>

            {/* User search */}
            <AnimatePresence>
              {target === 'specific' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className="text-white/50 text-xs font-medium block mb-2">Rechercher un utilisateur</label>
                  <div ref={searchRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        value={userSearch}
                        onChange={e => searchUsers(e.target.value)}
                        onFocus={() => userResults.length > 0 && setShowDropdown(true)}
                        placeholder="Nom d'utilisateur ou email…"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-primary/50 transition-colors"
                      />
                      {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 animate-spin" />}
                      {selectedUser && !searching && (
                        <button onClick={() => { setSelectedUser(null); setUserSearch(''); setUserResults([]) }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Selected user badge */}
                    {selectedUser && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/25 rounded-xl">
                        {selectedUser.avatar
                          ? <Image src={`https://cdn.discordapp.com/avatars/${selectedUser.discord_id}/${selectedUser.avatar}.png`} alt="" width={24} height={24} className="rounded-full" />
                          : <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-primary text-xs font-bold">{selectedUser.username[0].toUpperCase()}</div>
                        }
                        <span className="text-primary text-sm font-medium">{selectedUser.username}</span>
                        <CheckCircle className="w-3.5 h-3.5 text-primary ml-auto" />
                      </div>
                    )}

                    {/* Dropdown */}
                    <AnimatePresence>
                      {showDropdown && userResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl"
                        >
                          {userResults.map(u => {
                            const avatar = u.avatar ? `https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png` : null
                            return (
                              <button key={u.id} onClick={() => selectUser(u)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-white/[0.05] last:border-0 text-left">
                                {avatar
                                  ? <Image src={avatar} alt="" width={28} height={28} className="rounded-full flex-shrink-0" />
                                  : <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">{u.username[0].toUpperCase()}</div>
                                }
                                <div className="min-w-0">
                                  <p className="text-white text-sm font-medium truncate">{u.username}</p>
                                  {u.email && <p className="text-white/30 text-xs truncate">{u.email}</p>}
                                </div>
                              </button>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Type */}
            <div>
              <label className="text-white/50 text-xs font-medium block mb-2">Type</label>
              <div className="flex gap-2 flex-wrap">
                {TYPE_OPTIONS.map(t => (
                  <button key={t.value} onClick={() => setType(t.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      type === t.value
                        ? 'text-white border-transparent'
                        : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white/70'
                    }`}
                    style={type === t.value ? { backgroundColor: t.color + '30', borderColor: t.color + '50', color: t.color } : {}}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-white/50 text-xs font-medium block mb-2">Titre</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Titre accrocheur…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-primary/50 transition-colors"
              />
              <CharBar value={title.length} max={100} />
            </div>

            {/* Message */}
            <div>
              <label className="text-white/50 text-xs font-medium block mb-2">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={300}
                rows={4}
                placeholder="Contenu de la notification…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-primary/50 transition-colors resize-none"
              />
              <CharBar value={message.length} max={300} />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={send}
              disabled={!title.trim() || !message.trim() || sending}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                sent
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Envoi en cours…</>
              ) : sent ? (
                <><CheckCircle className="w-4 h-4" />Notification envoyée !</>
              ) : (
                <><Zap className="w-4 h-4" />Envoyer à {target === 'all' ? `tous (${totalUsers})` : selectedUser?.username || '…'}</>
              )}
            </button>
          </motion.div>
        </div>

        {/* ── RIGHT: Preview + History ── */}
        <div className="space-y-4">

          {/* Live preview */}
          <motion.div {...fade(0.12)} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-white font-semibold text-sm mb-1">Aperçu en direct</p>
            <p className="text-white/30 text-xs mb-4">Rendu tel que vu par l'utilisateur</p>
            <Preview title={title} message={message} type={type} />
          </motion.div>

          {/* Quick stats */}
          <motion.div {...fade(0.14)} className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{totalUsers}</p>
              <p className="text-white/35 text-xs mt-0.5">Utilisateurs</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{history.length}</p>
              <p className="text-white/35 text-xs mt-0.5">Envoyées (session)</p>
            </div>
          </motion.div>

          {/* Recent sent history (session) */}
          <motion.div {...fade(0.16)} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-white/[0.07] flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/40" />
              <p className="text-white font-semibold text-sm">Historique de session</p>
            </div>
            {history.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-7 h-7 text-white/15 mx-auto mb-2" />
                <p className="text-white/25 text-sm">Aucun envoi cette session</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05] max-h-72 overflow-y-auto">
                <AnimatePresence>
                  {history.map((h, i) => {
                    const typeConf = TYPE_OPTIONS.find(t => t.value === h.type) || TYPE_OPTIONS[0]
                    return (
                      <motion.div key={h.id}
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                        className="px-4 py-3 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: typeConf.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">{h.title}</p>
                            <p className="text-white/35 text-[10px] line-clamp-1 mt-0.5">{h.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-white/25 text-[10px]">{new Date(h.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-[10px]" style={{ color: typeConf.color }}>→ {h.recipients} destinataire{h.recipients > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Tips */}
          <motion.div {...fade(0.18)} className="bg-amber-400/5 border border-amber-400/15 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-amber-400 text-xs font-semibold">Bonnes pratiques</p>
            </div>
            <ul className="space-y-1">
              {[
                'Titre court et accrocheur (max 60 car.)',
                'Message clair et sans jargon technique',
                'Évite les emojis dans les titres',
                'Évite les envois groupés répétés',
              ].map((tip, i) => (
                <li key={i} className="text-white/35 text-[11px] flex items-start gap-1.5">
                  <span className="text-amber-400/60 flex-shrink-0 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  )
}