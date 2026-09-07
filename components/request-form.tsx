'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Film, Tv, Star, Check, X, Send, ArrowLeft,
  ThumbsUp, Trophy, Flame, Clock, Filter, ChevronDown, Plus
} from 'lucide-react'
import Image from 'next/image'
import { useDrawer } from '@/components/movie-drawer'

interface TMDBResult {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  overview: string
}

interface ContentRequest {
  id: string
  title: string
  content_type: 'movie' | 'series'
  poster: string | null
  tmdb_id: number | null
  status: 'pending' | 'approved' | 'rejected'
  votes: number
  description: string
  created_at: string
  user: { username: string; avatar: string | null }
  user_id: string
}

interface RequestFormProps {
  userId: string
}

const STATUS_CONFIG = {
  pending:  { label: 'En attente', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Validé',     color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  rejected: { label: 'Refusé',     color: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

export function RequestForm({ userId }: RequestFormProps) {
  const { openDrawer } = useDrawer()

  // View state
  const [view, setView] = useState<'list' | 'new'>('list')

  // List state
  const [requests, setRequests] = useState<ContentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes')
  const [search, setSearch] = useState('')
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [votingId, setVotingId] = useState<string | null>(null)

  // New request state
  const [tab, setTab] = useState<'movie' | 'series'>('movie')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<TMDBResult | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [alreadyAvailable, setAlreadyAvailable] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load requests + voted IDs
  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const [reqRes, votesRes] = await Promise.all([
        fetch('/api/requests'),
        fetch(`/api/requests/vote?user_id=${userId}`),
      ])
      const reqData = await reqRes.json()
      const votesData = await votesRes.json()
      setRequests(Array.isArray(reqData) ? reqData : [])
      setVotedIds(new Set(votesData.voted_ids || []))
    } catch {}
    setLoading(false)
  }, [userId])

  useEffect(() => { loadRequests() }, [loadRequests])

  // Search TMDB
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(searchTimer.current!)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const type = tab === 'movie' ? 'movie' : 'tv'
        const res = await fetch(`/api/auth/admin/tmdb-search?q=${encodeURIComponent(query)}&type=${type}`)
        const data = await res.json()
        setResults(data.results?.slice(0, 6) || [])
      } catch {}
      setSearching(false)
    }, 400)
  }, [query, tab])

  // Check availability
  useEffect(() => {
    if (!selected) return
    setAlreadyAvailable(false)
    fetch(`/api/auth/admin/api-catalogue?tmdbId=${selected.id}&type=${tab === 'movie' ? 'movie' : 'series'}`)
      .then(r => r.json())
      .then(d => setAlreadyAvailable(d.exists))
      .catch(() => {})
  }, [selected, tab])

  const handleVote = async (req: ContentRequest) => {
    if (votingId) return
    setVotingId(req.id)
    const hasVoted = votedIds.has(req.id)
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, votes: r.votes + (hasVoted ? -1 : 1) } : r))
    setVotedIds(prev => { const s = new Set(prev); hasVoted ? s.delete(req.id) : s.add(req.id); return s })
    try {
      await fetch('/api/requests/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: req.id, user_id: userId }),
      })
    } catch {
      // Revert on error
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, votes: r.votes + (hasVoted ? 1 : -1) } : r))
      setVotedIds(prev => { const s = new Set(prev); hasVoted ? s.add(req.id) : s.delete(req.id); return s })
    }
    setVotingId(null)
  }

  const handleSend = async () => {
    if (!selected) return
    setSending(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: selected.title || selected.name || '',
          content_type: tab,
          description: message || selected.overview?.slice(0, 200) || '',
          tmdb_id: selected.id,
          poster: selected.poster_path,
        }),
      })
      if (res.ok) { setSent(true); loadRequests() }
    } catch {}
    setSending(false)
  }

  // Filtered + sorted requests
  const filtered = requests
    .filter(r => filterType === 'all' || r.content_type === filterType)
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'votes' ? (b.votes || 0) - (a.votes || 0) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Top 3 for podium
  const top3 = [...requests]
    .filter(r => r.status !== 'rejected')
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .slice(0, 3)

  // ─── SENT STATE ───
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/50 flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-12 h-12 text-green-400" />
          </motion.div>
          <h2 className="text-3xl font-black text-white mb-2">Demande envoyée !</h2>
          <p className="text-white/40 mb-8">Tu seras notifié quand ta demande sera traitée.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setSent(false); setSelected(null); setQuery(''); setMessage(''); setView('list') }}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-sm font-semibold transition-all">
              Voir les demandes
            </button>
            <button onClick={() => { setSent(false); setSelected(null); setQuery(''); setMessage('') }}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-sm font-semibold transition-all">
              Nouvelle demande
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/8 p-6 md:p-8"
          style={{ background: 'radial-gradient(120% 120% at 100% 0%, rgba(220,38,38,0.16) 0%, transparent 50%), linear-gradient(160deg, rgba(24,24,27,0.9), rgba(10,10,12,0.9))' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="inline-flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Catalogue participatif
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
                Souhaits
              </h1>
              <p className="text-white/40 mt-2 text-sm max-w-md">Vote pour les titres que tu veux voir arriver sur StreamSelf. Les plus demandés sont ajoutés en priorité.</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setView(view === 'new' ? 'list' : 'new')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all shrink-0"
              style={view === 'new'
                ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }
                : { background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 6px 20px rgba(220,38,38,0.4)', color: '#fff' }}
            >
              {view === 'new' ? <><X className="w-4 h-4" /> Annuler</> : <><Plus className="w-4 h-4" /> Faire une demande</>}
            </motion.button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7">
            {[
              { label: 'Demandes', value: requests.length, color: '#fff' },
              { label: 'En attente', value: requests.filter(r => r.status === 'pending').length, color: '#facc15' },
              { label: 'Validées', value: requests.filter(r => r.status === 'approved').length, color: '#4ade80' },
              { label: 'Votes cumulés', value: requests.reduce((s, r) => s + (r.votes || 0), 0), color: '#f87171' },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-2xl font-black tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── NEW REQUEST FORM ── */}
        {view === 'new' && (
          <motion.div key="new" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="bg-zinc-900/60 border border-white/8 rounded-3xl p-6 md:p-8 space-y-8 backdrop-blur-sm mb-10">

            {/* Type */}
            <div>
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">Type</p>
              <div className="grid grid-cols-2 gap-3">
                {[{ value: 'movie', label: 'Film', icon: Film }, { value: 'series', label: 'Série', icon: Tv }].map(opt => {
                  const Icon = opt.icon
                  const active = tab === opt.value
                  return (
                    <button key={opt.value}
                      onClick={() => { setTab(opt.value as any); setSelected(null); setQuery(''); setResults([]) }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${active ? 'bg-red-600/10 border-red-500/50 text-white' : 'bg-white/3 border-white/8 text-white/50 hover:border-white/20'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-red-600/20' : 'bg-white/8'}`}>
                        <Icon className={`w-5 h-5 ${active ? 'text-red-400' : 'text-white/40'}`} />
                      </div>
                      <span className="font-bold text-sm">{opt.label}</span>
                      {active && <Check className="w-4 h-4 text-red-400 ml-auto" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Search */}
            <div>
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">Rechercher</p>
              <div className="relative">
                <div className="flex items-center gap-3 bg-zinc-800/80 border border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-white/25 transition-colors">
                  {searching ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin shrink-0" />
                    : <Search className="w-4 h-4 text-white/30 shrink-0" />}
                  <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null) }}
                    placeholder={`Rechercher un ${tab === 'movie' ? 'film' : 'une série'}...`}
                    className="flex-1 bg-transparent text-white outline-none placeholder-white/20 text-sm" />
                  {query && <button onClick={() => { setQuery(''); setResults([]); setSelected(null) }}><X className="w-4 h-4 text-white/30 hover:text-white/60" /></button>}
                </div>
                <AnimatePresence>
                  {results.length > 0 && !selected && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden z-10 shadow-2xl">
                      {results.map(r => {
                        const title = r.title || r.name || ''
                        const year = (r.release_date || r.first_air_date || '').slice(0, 4)
                        return (
                          <button key={r.id} onClick={() => { setSelected(r); setResults([]) }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left">
                            <div className="relative w-8 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                              {r.poster_path && <Image src={`https://image.tmdb.org/t/p/w92${r.poster_path}`} alt={title} fill className="object-cover" sizes="32px" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-semibold truncate">{title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {year && <span className="text-white/35 text-xs">{year}</span>}
                                <span className="text-yellow-400 text-xs">★ {r.vote_average?.toFixed(1)}</span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Selected */}
            <AnimatePresence>
              {selected && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="relative rounded-2xl overflow-hidden border border-white/10">
                    {selected.backdrop_path && (
                      <div className="relative h-36">
                        <Image src={`https://image.tmdb.org/t/p/w780${selected.backdrop_path}`} alt="" fill className="object-cover" />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(24,24,27,1) 0%, rgba(24,24,27,0.4) 60%, transparent)' }} />
                      </div>
                    )}
                    <div className={`flex gap-4 p-4 ${selected.backdrop_path ? '-mt-16 relative' : ''}`}>
                      <div className="relative w-16 h-24 rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-xl">
                        {selected.poster_path && <Image src={`https://image.tmdb.org/t/p/w185${selected.poster_path}`} alt="" fill className="object-cover" sizes="64px" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-white font-black text-lg truncate">{selected.title || selected.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white/40 text-xs">{(selected.release_date || selected.first_air_date || '').slice(0, 4)}</span>
                          <span className="text-yellow-400 text-xs">★ {selected.vote_average?.toFixed(1)}</span>
                        </div>
                        <button onClick={() => { setSelected(null); setAlreadyAvailable(false) }}
                          className="flex items-center gap-1 text-white/25 hover:text-white/50 text-xs mt-2 transition-colors">
                          <ArrowLeft className="w-3 h-3" /> Changer
                        </button>
                      </div>
                    </div>
                    {alreadyAvailable && (
                      <div className="mx-4 mb-4 flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-xl px-3 py-2.5">
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                        <p className="text-green-400 font-semibold text-sm">Déjà disponible sur StreamSelf !</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message */}
            <AnimatePresence>
              {selected && !alreadyAvailable && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">Message <span className="text-white/15">(optionnel)</span></p>
                  <div className="relative">
                    <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 500))}
                      placeholder="Pourquoi ce titre mérite d'être ajouté ?"
                      rows={3}
                      className="w-full bg-zinc-800/80 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none focus:border-white/25 transition-colors resize-none" />
                    <span className="absolute bottom-3 right-4 text-white/20 text-xs">{message.length}/500</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <AnimatePresence>
              {selected && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {alreadyAvailable ? (
                    <button onClick={() => openDrawer(tab as 'movie' | 'series', selected.id)}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-2xl transition-all">
                      <Check className="w-5 h-5" /> Regarder maintenant
                    </button>
                  ) : (
                    <button onClick={handleSend} disabled={sending}
                      className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all">
                      {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                      {sending ? 'Envoi...' : 'Envoyer la demande'}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Leaderboard top 3 */}
            {top3.length >= 2 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Classement en direct</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {top3.map((req, idx) => {
                    const rank = idx + 1
                    const hasVoted = votedIds.has(req.id)
                    const leaderVotes = top3[0]?.votes || 1
                    const pct = Math.max(6, Math.round(((req.votes || 0) / leaderVotes) * 100))
                    const rankColor = rank === 1 ? '#facc15' : rank === 2 ? '#d4d4d8' : '#d97706'
                    return (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="relative flex items-center gap-4 rounded-2xl p-3 pr-4 overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${rank === 1 ? 'rgba(250,204,21,0.25)' : 'rgba(255,255,255,0.07)'}` }}
                      >
                        {/* Barre de progression de fond */}
                        <div className="absolute inset-y-0 left-0 pointer-events-none" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${rank === 1 ? 'rgba(250,204,21,0.10)' : 'rgba(239,68,68,0.07)'}, transparent)` }} />

                        {/* Rang */}
                        <div className="relative w-8 text-center shrink-0">
                          <span className="text-2xl font-black tabular-nums" style={{ color: rankColor }}>{rank}</span>
                        </div>

                        {/* Poster */}
                        <div className="relative w-11 h-16 rounded-lg overflow-hidden bg-zinc-800 shrink-0 shadow-lg">
                          {req.poster ? (
                            <Image src={`https://image.tmdb.org/t/p/w92${req.poster}`} alt={req.title} fill className="object-cover" sizes="44px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {req.content_type === 'movie' ? <Film className="w-5 h-5 text-zinc-600" /> : <Tv className="w-5 h-5 text-zinc-600" />}
                            </div>
                          )}
                        </div>

                        {/* Infos */}
                        <div className="relative flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">{req.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${STATUS_CONFIG[req.status].color}`}>{STATUS_CONFIG[req.status].label}</span>
                            <span className="text-white/35 text-xs">{req.content_type === 'movie' ? 'Film' : 'Série'}</span>
                          </div>
                        </div>

                        {/* Vote */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => handleVote(req)}
                          className={`relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-xl border transition-all shrink-0 ${
                            hasVoted ? 'bg-red-600/20 border-red-500/40 text-red-400' : 'bg-white/6 border-white/12 text-white/55 hover:text-white hover:bg-white/12'
                          }`}
                        >
                          <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'fill-red-400' : ''}`} />
                          <span className="text-[11px] font-black tabular-nums">{req.votes || 0}</span>
                        </motion.button>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {/* Search */}
              <div className="flex items-center gap-2 bg-zinc-900/80 border border-white/8 rounded-2xl px-3 py-2 flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Filtrer par titre..."
                  className="bg-transparent text-white text-sm outline-none placeholder-white/20 w-full" />
                {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-white/30" /></button>}
              </div>

              {/* Sort */}
              <button onClick={() => setSortBy(s => s === 'votes' ? 'recent' : 'votes')}
                className="flex items-center gap-2 bg-zinc-900/80 border border-white/8 rounded-2xl px-3 py-2 text-sm font-semibold text-white/60 hover:text-white transition-all">
                {sortBy === 'votes' ? <><Flame className="w-3.5 h-3.5 text-orange-400" /> Populaires</> : <><Clock className="w-3.5 h-3.5" /> Récents</>}
              </button>

              {/* Type filter */}
              {['all', 'movie', 'series'].map(t => (
                <button key={t} onClick={() => setFilterType(t as any)}
                  className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all ${filterType === t ? 'bg-white/12 border-white/25 text-white' : 'bg-zinc-900/80 border-white/8 text-white/40 hover:text-white/70'}`}>
                  {t === 'all' ? 'Tous' : t === 'movie' ? 'Films' : 'Séries'}
                </button>
              ))}

              {/* Status filter */}
              {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all ${filterStatus === s ? 'bg-white/12 border-white/25 text-white' : 'bg-zinc-900/80 border-white/8 text-white/40 hover:text-white/70'}`}>
                  {s === 'all' ? 'Tous statuts' : STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            {/* Cards list */}
            {loading ? (
              <div className="grid gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-zinc-900/60 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Search className="w-10 h-10 text-white/10" />
                <p className="text-white/25">Aucune demande trouvée</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filtered.map((req, i) => {
                  const hasVoted = votedIds.has(req.id)
                  const isVoting = votingId === req.id
                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.3) }}
                      className="group flex items-center gap-4 bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/6 hover:border-white/12 rounded-2xl p-3 transition-all"
                    >
                      {/* Rang (tri par votes) */}
                      {sortBy === 'votes' && (
                        <span className="w-6 text-center text-sm font-black tabular-nums text-white/25 shrink-0">{i + 1}</span>
                      )}
                      {/* Poster */}
                      <div className="relative w-12 h-16 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                        {req.poster ? (
                          <Image src={`https://image.tmdb.org/t/p/w92${req.poster}`} alt={req.title} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {req.content_type === 'movie' ? <Film className="w-5 h-5 text-zinc-600" /> : <Tv className="w-5 h-5 text-zinc-600" />}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-bold text-sm truncate">{req.title}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${STATUS_CONFIG[req.status].color}`}>
                            {STATUS_CONFIG[req.status].label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/30">
                          <span className={`px-1.5 py-0.5 rounded-md ${req.content_type === 'movie' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'} font-bold`}>
                            {req.content_type === 'movie' ? 'Film' : 'Série'}
                          </span>
                          <span>par {req.user?.username || 'Anonyme'}</span>
                          <span>· {new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>

                      {/* Vote button */}
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => handleVote(req)}
                        disabled={isVoting}
                        className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl border transition-all shrink-0 ${
                          hasVoted
                            ? 'bg-red-600/15 border-red-500/40 text-red-400'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <ThumbsUp className={`w-4 h-4 transition-all ${hasVoted ? 'fill-red-400' : ''} ${isVoting ? 'animate-bounce' : ''}`} />
                        <span className="text-[11px] font-black">{req.votes || 0}</span>
                      </motion.button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
