'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Film, Tv, Zap, Search, Plus, Trash2, Edit, Star, Loader2, X,
  Check, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  BarChart3, Play, Pause, Library,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────
interface TMDBResult {
  id: number; title?: string; name?: string
  poster_path: string | null; release_date?: string; first_air_date?: string
  vote_average: number; overview: string; popularity: number
}
interface CatalogItem {
  id: number; tmdb_id: number; title: string
  poster_path: string | null; vote_average: number; release_date?: string
  video_url?: string | null; download_url?: string | null
}
interface VerifItem { tmdb_id: number; title: string; popularity: number }
interface VerifStats {
  total_tmdb: number; in_catalogue: number; already_checked: number; pending: number; items: VerifItem[]
}

const TMDB_KEY = '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'

// ─── Shared UI ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: any; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count !== undefined && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Films Tab ───────────────────────────────────────────────────────────────
function FilmsTab() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/auth/admin/content?type=movie')
      .then(r => r.json()).then(d => setItems(d.items || d || []))
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const searchTMDB = async () => {
    if (!tmdbQuery.trim()) return
    setSearching(true)
    try {
      const r = await fetch(`${TMDB}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(tmdbQuery)}&language=fr-FR`)
      const d = await r.json()
      setTmdbResults(d.results || [])
    } catch {} finally { setSearching(false) }
  }

  const addMovie = async (result: TMDBResult) => {
    setAddingId(result.id)
    try {
      const r = await fetch('/api/auth/admin/content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'movie', tmdbData: result }),
      })
      if (r.ok) {
        const data = await r.json()
        setItems(prev => prev.find(i => i.tmdb_id === result.id) ? prev : [data, ...prev])
        setAddedIds(prev => new Set([...prev, result.id]))
      }
    } catch {} finally { setAddingId(null) }
  }

  const deleteMovie = async (id: number) => {
    if (!confirm('Supprimer ce film ?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/auth/admin/content?id=${id}&type=movie`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== id))
    } catch {} finally { setDeletingId(null) }
  }

  const filtered = items.filter(i => !filter || i.title?.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrer les films…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors" />
        </div>
        <button onClick={() => setShowAdd(o => !o)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'Fermer' : 'Ajouter un film'}
        </button>
      </div>

      {/* Add panel */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-sm font-semibold text-white mb-3">Rechercher sur TMDB</p>
            <div className="flex gap-2">
              <input value={tmdbQuery} onChange={e => setTmdbQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchTMDB()}
                placeholder="Titre du film…"
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors" />
              <button onClick={searchTMDB} disabled={searching}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.10] transition-colors disabled:opacity-50">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chercher'}
              </button>
            </div>
            {tmdbResults.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {tmdbResults.map(r => {
                  const added = addedIds.has(r.id) || items.some(i => i.tmdb_id === r.id)
                  return (
                    <div key={r.id} className="group relative rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.03] cursor-pointer"
                      onClick={() => !added && addMovie(r)}>
                      <div className="aspect-[2/3] relative">
                        {r.poster_path
                          ? <Image src={`https://image.tmdb.org/t/p/w300${r.poster_path}`} alt={r.title || ''} fill sizes="120px" className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center bg-white/5"><Film className="w-6 h-6 text-white/20" /></div>
                        }
                        <div className={`absolute inset-0 flex items-center justify-center transition-all ${added ? 'bg-emerald-500/30' : 'bg-black/0 group-hover:bg-black/50'}`}>
                          {addingId === r.id ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                            : added ? <Check className="w-6 h-6 text-emerald-400" />
                            : <Plus className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-white text-[11px] font-medium truncate">{r.title}</p>
                        <p className="text-white/30 text-[10px]">{r.release_date?.slice(0, 4)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/[0.04] animate-pulse aspect-[2/3]" />
          ))}
        </div>
      ) : (
        <div>
          <p className="text-xs text-white/25 mb-3">{filtered.length} film{filtered.length > 1 ? 's' : ''} au catalogue</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map(item => (
              <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="group relative rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.03]">
                <div className="aspect-[2/3] relative">
                  {item.poster_path
                    ? <Image src={`https://image.tmdb.org/t/p/w300${item.poster_path}`} alt={item.title} fill sizes="120px" className="object-cover" />
                    : <div className="w-full h-full flex items-center justify-center bg-white/5"><Film className="w-6 h-6 text-white/20" /></div>
                  }
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center">
                    <button onClick={() => deleteMovie(item.id)} disabled={deletingId === item.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30">
                      {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {item.vote_average > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] text-white font-bold">{item.vote_average.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-white text-[11px] font-medium truncate">{item.title}</p>
                  <p className="text-white/30 text-[10px]">{item.release_date?.slice(0, 4)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Séries Tab ───────────────────────────────────────────────────────────────
function SeriesTab() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/auth/admin/content?type=series')
      .then(r => r.json()).then(d => setItems(d.items || d || []))
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const searchTMDB = async () => {
    if (!tmdbQuery.trim()) return
    setSearching(true)
    try {
      const r = await fetch(`${TMDB}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(tmdbQuery)}&language=fr-FR`)
      const d = await r.json()
      setTmdbResults(d.results || [])
    } catch {} finally { setSearching(false) }
  }

  const addSeries = async (result: TMDBResult) => {
    setAddingId(result.id)
    try {
      const r = await fetch('/api/auth/admin/content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'series', tmdbData: result }),
      })
      if (r.ok) {
        const data = await r.json()
        setItems(prev => prev.find(i => i.tmdb_id === result.id) ? prev : [data, ...prev])
        setAddedIds(prev => new Set([...prev, result.id]))
      }
    } catch {} finally { setAddingId(null) }
  }

  const deleteSeries = async (id: number) => {
    if (!confirm('Supprimer cette série ?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/auth/admin/content?id=${id}&type=series`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== id))
    } catch {} finally { setDeletingId(null) }
  }

  const filtered = items.filter(i => !filter || i.title?.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrer les séries…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors" />
        </div>
        <button onClick={() => setShowAdd(o => !o)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'Fermer' : 'Ajouter une série'}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-sm font-semibold text-white mb-3">Rechercher sur TMDB</p>
            <div className="flex gap-2">
              <input value={tmdbQuery} onChange={e => setTmdbQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchTMDB()}
                placeholder="Titre de la série…"
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors" />
              <button onClick={searchTMDB} disabled={searching}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.10] transition-colors disabled:opacity-50">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chercher'}
              </button>
            </div>
            {tmdbResults.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {tmdbResults.map(r => {
                  const added = addedIds.has(r.id) || items.some(i => i.tmdb_id === r.id)
                  return (
                    <div key={r.id} className="group relative rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.03] cursor-pointer"
                      onClick={() => !added && addSeries(r)}>
                      <div className="aspect-[2/3] relative">
                        {r.poster_path
                          ? <Image src={`https://image.tmdb.org/t/p/w300${r.poster_path}`} alt={r.name || ''} fill sizes="120px" className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center bg-white/5"><Tv className="w-6 h-6 text-white/20" /></div>
                        }
                        <div className={`absolute inset-0 flex items-center justify-center transition-all ${added ? 'bg-emerald-500/30' : 'bg-black/0 group-hover:bg-black/50'}`}>
                          {addingId === r.id ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                            : added ? <Check className="w-6 h-6 text-emerald-400" />
                            : <Plus className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-white text-[11px] font-medium truncate">{r.name}</p>
                        <p className="text-white/30 text-[10px]">{r.first_air_date?.slice(0, 4)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="rounded-xl bg-white/[0.04] animate-pulse aspect-[2/3]" />)}
        </div>
      ) : (
        <div>
          <p className="text-xs text-white/25 mb-3">{filtered.length} série{filtered.length > 1 ? 's' : ''} au catalogue</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map(item => (
              <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="group relative rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.03]">
                <div className="aspect-[2/3] relative">
                  {item.poster_path
                    ? <Image src={`https://image.tmdb.org/t/p/w300${item.poster_path}`} alt={item.title} fill sizes="120px" className="object-cover" />
                    : <div className="w-full h-full flex items-center justify-center bg-white/5"><Tv className="w-6 h-6 text-white/20" /></div>
                  }
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center">
                    <button onClick={() => deleteSeries(item.id)} disabled={deletingId === item.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30">
                      {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {item.vote_average > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] text-white font-bold">{item.vote_average.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-white text-[11px] font-medium truncate">{item.title}</p>
                  <p className="text-white/30 text-[10px]">{item.release_date?.slice(0, 4)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── API Tab (formerly api-catalogue) ────────────────────────────────────────
function ApiTab() {
  const [tab, setTab] = useState<'search' | 'verif'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'movie' | 'tv'>('movie')
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())
  const [addingId, setAddingId] = useState<number | null>(null)
  const [verifStats, setVerifStats] = useState<VerifStats | null>(null)
  const [verifLoading, setVerifLoading] = useState(false)
  const [verifRunning, setVerifRunning] = useState(false)
  const [verifProgress, setVerifProgress] = useState(0)
  const [verifTotal, setVerifTotal] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const searchTMDB = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const endpoint = searchType === 'movie' ? 'movie' : 'tv'
      const r = await fetch(`${TMDB}/search/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(searchQuery)}&language=fr-FR`)
      const d = await r.json()
      setSearchResults(d.results || [])
    } catch {} finally { setSearching(false) }
  }

  const addContent = async (result: TMDBResult) => {
    setAddingId(result.id)
    try {
      const r = await fetch('/api/auth/admin/content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: searchType === 'movie' ? 'movie' : 'series', tmdbData: result }),
      })
      if (r.ok) setAddedIds(prev => new Set([...prev, result.id]))
    } catch {} finally { setAddingId(null) }
  }

  const loadVerifStats = async () => {
    setVerifLoading(true)
    try {
      const r = await fetch('/api/auth/admin/api-catalogue/verif-stats')
      if (r.ok) setVerifStats(await r.json())
    } catch {} finally { setVerifLoading(false) }
  }

  useEffect(() => { if (tab === 'verif') loadVerifStats() }, [tab])

  const runVerif = async () => {
    if (!verifStats) return
    setVerifRunning(true)
    setVerifProgress(0)
    setVerifTotal(verifStats.items.length)
    abortRef.current = new AbortController()
    try {
      for (let i = 0; i < verifStats.items.length; i++) {
        if (abortRef.current.signal.aborted) break
        const item = verifStats.items[i]
        await fetch('/api/auth/admin/api-catalogue/check', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_id: item.tmdb_id }),
          signal: abortRef.current.signal,
        }).catch(() => {})
        setVerifProgress(i + 1)
      }
      await loadVerifStats()
    } catch {} finally { setVerifRunning(false) }
  }

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
        {(['search', 'verif'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
            {t === 'search' ? '🔍 Recherche TMDB' : '⚡ Vérification catalogue'}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
              <button onClick={() => setSearchType('movie')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${searchType === 'movie' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`}>
                <Film className="w-3.5 h-3.5 inline mr-1.5" />Films
              </button>
              <button onClick={() => setSearchType('tv')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${searchType === 'tv' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`}>
                <Tv className="w-3.5 h-3.5 inline mr-1.5" />Séries
              </button>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchTMDB()}
                placeholder={`Rechercher ${searchType === 'movie' ? 'un film' : 'une série'}…`}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors" />
            </div>
            <button onClick={searchTMDB} disabled={searching}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-lg shadow-primary/20">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chercher'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {searchResults.map(r => {
                const added = addedIds.has(r.id)
                const title = r.title || r.name || ''
                const year = (r.release_date || r.first_air_date || '').slice(0, 4)
                return (
                  <div key={r.id} className="group relative rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.03] cursor-pointer"
                    onClick={() => !added && addContent(r)}>
                    <div className="aspect-[2/3] relative">
                      {r.poster_path
                        ? <Image src={`https://image.tmdb.org/t/p/w300${r.poster_path}`} alt={title} fill sizes="120px" className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center bg-white/5">
                            {searchType === 'movie' ? <Film className="w-6 h-6 text-white/20" /> : <Tv className="w-6 h-6 text-white/20" />}
                          </div>
                      }
                      <div className={`absolute inset-0 flex items-center justify-center transition-all ${added ? 'bg-emerald-500/30' : 'bg-black/0 group-hover:bg-black/50'}`}>
                        {addingId === r.id ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                          : added ? <Check className="w-6 h-6 text-emerald-400" />
                          : <Plus className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-white text-[11px] font-medium truncate">{title}</p>
                      <p className="text-white/30 text-[10px]">{year}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'verif' && (
        <div className="space-y-4">
          {verifLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-white/20 animate-spin" /></div>
          ) : verifStats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total TMDB', value: verifStats.total_tmdb, color: '#3b82f6' },
                  { label: 'Au catalogue', value: verifStats.in_catalogue, color: '#10b981' },
                  { label: 'Vérifiés', value: verifStats.already_checked, color: '#8b5cf6' },
                  { label: 'En attente', value: verifStats.pending, color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <p className="text-xs text-white/30 mb-1">{s.label}</p>
                    <p className="text-2xl font-black text-white">{s.value}</p>
                    <div className="mt-2 h-1 rounded-full bg-white/[0.05]">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${(s.value / Math.max(verifStats.total_tmdb, 1)) * 100}%`,
                        background: s.color,
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {verifRunning && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-amber-400">Vérification en cours…</span>
                    <span className="text-xs text-white/30">{verifProgress} / {verifTotal}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(verifProgress / Math.max(verifTotal, 1)) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={verifRunning ? () => abortRef.current?.abort() : runVerif}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    verifRunning ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                  }`}>
                  {verifRunning ? <><Pause className="w-4 h-4" /> Arrêter</> : <><Play className="w-4 h-4" /> Lancer la vérification</>}
                </button>
                <button onClick={loadVerifStats} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-sm font-medium hover:bg-white/[0.07] transition-colors">
                  <RefreshCw className="w-4 h-4" /> Actualiser
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-white/20 text-sm">Impossible de charger les statistiques</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Catalogue Page ──────────────────────────────────────────────────────
export default function CataloguePage() {
  const [tab, setTab] = useState<'films' | 'series' | 'api'>('films')

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-primary/60 uppercase mb-1">Administration</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Catalogue</h1>
              <p className="text-white/30 text-sm">Gérez vos films, séries et l'API de contenu</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <TabBtn active={tab === 'films'} onClick={() => setTab('films')} icon={Film} label="Films" />
          <TabBtn active={tab === 'series'} onClick={() => setTab('series')} icon={Tv} label="Séries" />
          <TabBtn active={tab === 'api'} onClick={() => setTab('api')} icon={Zap} label="API" />
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === 'films' && <FilmsTab />}
            {tab === 'series' && <SeriesTab />}
            {tab === 'api' && <ApiTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
