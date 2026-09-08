'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Film, Tv, Check, X, Send, ThumbsUp, Plus } from 'lucide-react'
import Image from 'next/image'
import { useDrawer } from '@/components/movie-drawer'

interface TMDBResult {
  id: number
  title?: string
  name?: string
  original_title?: string
  original_name?: string
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

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'text-white/40' },
  approved: { label: 'Ajouté', className: 'text-emerald-400' },
  rejected: { label: 'Refusé', className: 'text-red-400/80' },
}

export function RequestForm({ userId }: { userId: string }) {
  const { openDrawer } = useDrawer()
  const [view, setView] = useState<'list' | 'new'>('list')
  const [requests, setRequests] = useState<ContentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<'all' | 'movie' | 'series'>('all')
  const [status, setStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [sort, setSort] = useState<'votes' | 'recent'>('votes')
  const [search, setSearch] = useState('')
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [votingId, setVotingId] = useState<string | null>(null)

  const [tab, setTab] = useState<'movie' | 'series'>('movie')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<TMDBResult | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [alreadyAvailable, setAlreadyAvailable] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(searchTimer.current!)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/auth/admin/tmdb-search?q=${encodeURIComponent(query)}&type=${tab === 'movie' ? 'movie' : 'tv'}`)
        const data = await res.json()
        setResults(data.results?.slice(0, 8) || [])
      } catch {}
      setSearching(false)
    }, 400)
  }, [query, tab])

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
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, votes: r.votes + (hasVoted ? -1 : 1) } : r))
    setVotedIds(prev => { const s = new Set(prev); hasVoted ? s.delete(req.id) : s.add(req.id); return s })
    try {
      await fetch('/api/requests/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: req.id, user_id: userId }),
      })
    } catch {
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
          title: selected.title || selected.name || selected.original_title || selected.original_name || '',
          content_type: tab,
          description: selected.overview?.slice(0, 200) || '',
          tmdb_id: selected.id,
          poster: selected.poster_path,
        }),
      })
      if (res.ok) { setSent(true); loadRequests() }
    } catch {}
    setSending(false)
  }

  const filtered = requests
    .filter(r => type === 'all' || r.content_type === type)
    .filter(r => status === 'all' || r.status === status)
    .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'votes'
      ? (b.votes || 0) - (a.votes || 0)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const cover = requests.find(r => r.poster)?.poster
  const pending = requests.filter(r => r.status === 'pending').length

  const resetNew = () => {
    setSent(false)
    setSelected(null)
    setQuery('')
    setResults([])
    setAlreadyAvailable(false)
  }

  return (
    <div className="pb-24 font-[family-name:var(--font-montserrat)]">
      <div className="relative h-[240px] md:h-[280px] overflow-hidden">
        {cover && (
          <Image
            src={`https://image.tmdb.org/t/p/w1280${cover.startsWith('/') ? cover : `/${cover}`}`}
            alt=""
            fill
            priority
            className="object-cover object-top opacity-35"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/60 to-black/50" />
        <div className="relative h-full max-w-[1400px] mx-auto px-5 md:px-8 flex flex-col justify-end pb-8 pt-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Souhaits</h1>
              <p className="text-white/40 text-sm mt-2">{pending} en attente</p>
            </div>
            <button
              onClick={() => { resetNew(); setView(v => v === 'new' ? 'list' : 'new') }}
              className="h-11 px-4 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-2 shrink-0"
            >
              {view === 'new' ? <><X className="w-4 h-4" /> Fermer</> : <><Plus className="w-4 h-4" /> Demander</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <AnimatePresence mode="wait">
          {view === 'new' ? (
            <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-2">
              {sent ? (
                <div className="py-16 text-center">
                  <Check className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                  <p className="text-white text-lg font-semibold">Demande envoyée</p>
                  <p className="text-white/40 text-sm mt-1 mb-6">Tu seras prévenu quand elle sera traitée.</p>
                  <button onClick={() => { resetNew(); setView('list') }} className="h-11 px-5 rounded-xl bg-white text-black text-sm font-semibold">
                    Voir les souhaits
                  </button>
                </div>
              ) : (
                <div className="max-w-xl space-y-5">
                  <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 w-fit">
                    {(['movie', 'series'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => { setTab(t); setSelected(null); setQuery(''); setResults([]) }}
                        className={`px-4 h-9 rounded-lg text-sm font-semibold ${tab === t ? 'bg-white text-black' : 'text-white/45 hover:text-white'}`}
                      >
                        {t === 'movie' ? 'Film' : 'Série'}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <div className="flex items-center gap-3 h-11 px-4 rounded-xl border border-white/10 bg-white/[0.04]">
                      {searching
                        ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin shrink-0" />
                        : <Search className="w-4 h-4 text-white/30 shrink-0" />}
                      <input
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelected(null) }}
                        placeholder="Rechercher un titre…"
                        className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/25"
                      />
                    </div>
                    {results.length > 0 && !selected && (
                      <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-white/10 bg-[#0c0c0e] overflow-hidden z-20">
                        {results.map(r => {
                          const title = r.title || r.name || r.original_title || r.original_name || ''
                          const year = (r.release_date || r.first_air_date || '').slice(0, 4)
                          return (
                            <button
                              key={r.id}
                              onClick={() => { setSelected(r); setResults([]) }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left"
                            >
                              <div className="relative w-8 h-12 rounded overflow-hidden bg-zinc-800 shrink-0">
                                {r.poster_path && (
                                  <Image src={`https://image.tmdb.org/t/p/w92${r.poster_path}`} alt="" fill className="object-cover" sizes="32px" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-white text-sm truncate">{title}</p>
                                <p className="text-white/30 text-xs">{year}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {selected && (
                    <div className="flex gap-4 items-start">
                      <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                        {selected.poster_path && (
                          <Image src={`https://image.tmdb.org/t/p/w185${selected.poster_path}`} alt="" fill className="object-cover" sizes="64px" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold">{selected.title || selected.name}</p>
                        <p className="text-white/35 text-sm mt-0.5">
                          {(selected.release_date || selected.first_air_date || '').slice(0, 4)}
                        </p>
                        {alreadyAvailable ? (
                          <button
                            onClick={() => openDrawer(tab, selected.id)}
                            className="mt-3 h-10 px-4 rounded-xl bg-white text-black text-sm font-semibold inline-flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" /> Déjà au catalogue
                          </button>
                        ) : (
                          <button
                            onClick={handleSend}
                            disabled={sending}
                            className="mt-3 h-10 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                          >
                            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                            Envoyer
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex-1 flex items-center gap-3 h-11 px-4 rounded-xl border border-white/10 bg-white/[0.04]">
                  <Search className="w-4 h-4 text-white/30 shrink-0" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher…"
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/25"
                  />
                </div>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as 'votes' | 'recent')}
                  className="h-11 px-3 rounded-xl border border-white/10 bg-[#121214] text-white text-sm outline-none"
                >
                  <option value="votes">Plus votés</option>
                  <option value="recent">Récents</option>
                </select>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
                {(['all', 'movie', 'series'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${type === t ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                  >
                    {t === 'all' ? 'Tous' : t === 'movie' ? 'Films' : 'Séries'}
                  </button>
                ))}
                <span className="w-px h-6 bg-white/10 self-center mx-1" />
                {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${status === s ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
                  >
                    {s === 'all' ? 'Tous statuts' : STATUS[s].label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="aspect-[2/3] rounded-lg bg-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-white/35 py-20">Aucun souhait</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
                  {filtered.map(req => {
                    const hasVoted = votedIds.has(req.id)
                    const poster = req.poster
                      ? `https://image.tmdb.org/t/p/w342${req.poster.startsWith('/') ? req.poster : `/${req.poster}`}`
                      : null
                    return (
                      <div key={req.id} className="group relative">
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
                          {poster ? (
                            <Image src={poster} alt={req.title} fill className="object-cover" sizes="14vw" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {req.content_type === 'movie' ? <Film className="w-6 h-6 text-white/15" /> : <Tv className="w-6 h-6 text-white/15" />}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-white text-[11px] font-medium line-clamp-2 leading-tight">{req.title}</p>
                            <p className={`text-[10px] mt-1 ${STATUS[req.status].className}`}>{STATUS[req.status].label}</p>
                          </div>
                          <button
                            onClick={() => handleVote(req)}
                            disabled={votingId === req.id}
                            className={`absolute top-2 right-2 min-w-[36px] h-8 px-1.5 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold ${
                              hasVoted ? 'bg-red-600 text-white' : 'bg-black/70 text-white/80 hover:bg-black/90'
                            }`}
                          >
                            <ThumbsUp className={`w-3 h-3 ${hasVoted ? 'fill-white' : ''}`} />
                            {req.votes || 0}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
