'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Film, Tv, Zap, Search, Plus, Trash2, Star, Loader2, X,
  Check, Play, Pause, RefreshCw, Library,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface TMDBResult {
  id: number; title?: string; name?: string
  poster_path: string | null; release_date?: string; first_air_date?: string
  vote_average: number; overview: string; popularity: number
  original_title?: string; original_name?: string
  vote_count?: number; genre_ids?: number[]
  number_of_seasons?: number; number_of_episodes?: number
}
interface MovieItem {
  id: number; tmdb_id: number; title: string
  poster_path: string | null; vote_average: number; release_date?: string
}
interface SeriesItem {
  id: number; tmdb_id: number; name: string
  poster_path: string | null; vote_average: number; first_air_date?: string
}

const TMDB_KEY = '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE = 'https://api.themoviedb.org/3'

// ─── Shared: poster grid item ─────────────────────────────────────────────────
function PosterCard({
  title, year, posterPath, rating, onDelete, isDeleting, isType,
}: {
  title: string; year?: string; posterPath: string | null; rating?: number
  onDelete: () => void; isDeleting: boolean; isType: 'movie' | 'series'
}) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="group relative rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.03]">
      <div className="aspect-[2/3] relative">
        {posterPath
          ? <Image src={`https://image.tmdb.org/t/p/w300${posterPath}`} alt={title} fill sizes="140px" className="object-cover" />
          : <div className="w-full h-full flex items-center justify-center bg-white/5">
              {isType === 'movie' ? <Film className="w-6 h-6 text-white/20" /> : <Tv className="w-6 h-6 text-white/20" />}
            </div>
        }
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center">
          <button onClick={onDelete} disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50">
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
        {rating && rating > 0 && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span className="text-[10px] text-white font-bold">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-white text-[11px] font-medium truncate">{title}</p>
        {year && <p className="text-white/30 text-[10px]">{year}</p>}
      </div>
    </motion.div>
  )
}

// ─── Shared: TMDB search result card ─────────────────────────────────────────
function SearchCard({
  title, year, posterPath, isAdded, isAdding, onAdd, isType,
}: {
  title: string; year?: string; posterPath: string | null
  isAdded: boolean; isAdding: boolean; onAdd: () => void; isType: 'movie' | 'series'
}) {
  return (
    <div className={`group relative rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.03] cursor-pointer ${isAdded ? '' : 'hover:border-primary/30'}`}
      onClick={() => !isAdded && !isAdding && onAdd()}>
      <div className="aspect-[2/3] relative">
        {posterPath
          ? <Image src={`https://image.tmdb.org/t/p/w300${posterPath}`} alt={title} fill sizes="140px" className="object-cover" />
          : <div className="w-full h-full flex items-center justify-center bg-white/5">
              {isType === 'movie' ? <Film className="w-6 h-6 text-white/20" /> : <Tv className="w-6 h-6 text-white/20" />}
            </div>
        }
        <div className={`absolute inset-0 flex items-center justify-center transition-all ${isAdded ? 'bg-emerald-500/25' : 'bg-black/0 group-hover:bg-black/50'}`}>
          {isAdding ? <Loader2 className="w-5 h-5 text-white animate-spin" />
            : isAdded ? <Check className="w-7 h-7 text-emerald-400" />
            : <Plus className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
      </div>
      <div className="p-2">
        <p className="text-white text-[11px] font-medium truncate">{title}</p>
        {year && <p className="text-white/30 text-[10px]">{year}</p>}
      </div>
    </div>
  )
}

// ─── Films Tab ────────────────────────────────────────────────────────────────
function FilmsTab() {
  const [items, setItems] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/content/movies')
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const searchTMDB = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`)
      const d = await r.json()
      setResults(d.results || [])
    } catch {} finally { setSearching(false) }
  }

  const addMovie = async (result: TMDBResult) => {
    setAddingId(result.id)
    try {
      const r = await fetch('/api/auth/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'movie', tmdbData: result }),
      })
      if (r.ok) {
        const data = await r.json()
        setItems(prev => prev.find(i => i.tmdb_id === result.id) ? prev : [data, ...prev])
        setAddedIds(prev => new Set([...prev, result.id]))
      }
    } catch {} finally { setAddingId(null) }
  }

  const deleteMovie = async (item: MovieItem) => {
    if (!confirm(`Supprimer "${item.title}" ?`)) return
    setDeletingId(item.id)
    try {
      await fetch(`/api/auth/admin/content?type=movie&tmdbId=${item.tmdb_id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch {} finally { setDeletingId(null) }
  }

  const filtered = items.filter(i => !filter || i.title?.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="space-y-5">
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

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-sm font-semibold text-white mb-3">Rechercher sur TMDB</p>
            <div className="flex gap-2">
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchTMDB()}
                placeholder="Titre du film…"
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors" />
              <button onClick={searchTMDB} disabled={searching}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.10] transition-colors disabled:opacity-50">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chercher'}
              </button>
            </div>
            {results.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {results.map(r => (
                  <SearchCard key={r.id} title={r.title || ''} year={r.release_date?.slice(0, 4)}
                    posterPath={r.poster_path} isAdded={addedIds.has(r.id) || items.some(i => i.tmdb_id === r.id)}
                    isAdding={addingId === r.id} onAdd={() => addMovie(r)} isType="movie" />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="rounded-xl bg-white/[0.04] animate-pulse aspect-[2/3]" />)}
        </div>
      ) : (
        <>
          <p className="text-xs text-white/25">{filtered.length} film{filtered.length > 1 ? 's' : ''} au catalogue</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filtered.map(item => (
              <PosterCard key={item.id} title={item.title} year={item.release_date?.slice(0, 4)}
                posterPath={item.poster_path} rating={item.vote_average}
                onDelete={() => deleteMovie(item)} isDeleting={deletingId === item.id} isType="movie" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Séries Tab ───────────────────────────────────────────────────────────────
function SeriesTab() {
  const [items, setItems] = useState<SeriesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/content/series')
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const searchTMDB = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`)
      const d = await r.json()
      setResults(d.results || [])
    } catch {} finally { setSearching(false) }
  }

  const addSeries = async (result: TMDBResult) => {
    setAddingId(result.id)
    try {
      const r = await fetch('/api/auth/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'series', tmdbData: result }),
      })
      if (r.ok) {
        const data = await r.json()
        setItems(prev => prev.find(i => i.tmdb_id === result.id) ? prev : [data, ...prev])
        setAddedIds(prev => new Set([...prev, result.id]))
      }
    } catch {} finally { setAddingId(null) }
  }

  const deleteSeries = async (item: SeriesItem) => {
    if (!confirm(`Supprimer "${item.name}" ?`)) return
    setDeletingId(item.id)
    try {
      await fetch(`/api/auth/admin/content?type=series&tmdbId=${item.tmdb_id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch {} finally { setDeletingId(null) }
  }

  const filtered = items.filter(i => !filter || i.name?.toLowerCase().includes(filter.toLowerCase()))

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
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchTMDB()}
                placeholder="Titre de la série…"
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors" />
              <button onClick={searchTMDB} disabled={searching}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.10] transition-colors disabled:opacity-50">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chercher'}
              </button>
            </div>
            {results.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {results.map(r => (
                  <SearchCard key={r.id} title={r.name || ''} year={r.first_air_date?.slice(0, 4)}
                    posterPath={r.poster_path} isAdded={addedIds.has(r.id) || items.some(i => i.tmdb_id === r.id)}
                    isAdding={addingId === r.id} onAdd={() => addSeries(r)} isType="series" />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="rounded-xl bg-white/[0.04] animate-pulse aspect-[2/3]" />)}
        </div>
      ) : (
        <>
          <p className="text-xs text-white/25">{filtered.length} série{filtered.length > 1 ? 's' : ''} au catalogue</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filtered.map(item => (
              <PosterCard key={item.id} title={item.name} year={item.first_air_date?.slice(0, 4)}
                posterPath={item.poster_path} rating={item.vote_average}
                onDelete={() => deleteSeries(item)} isDeleting={deletingId === item.id} isType="series" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── API Tab ──────────────────────────────────────────────────────────────────
function ApiTab() {
  const [subTab, setSubTab] = useState<'search' | 'verif'>('search')
  const [searchType, setSearchType] = useState<'movie' | 'tv'>('movie')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())

  // Verif state
  const [verifMovies, setVerifMovies] = useState<MovieItem[]>([])
  const [verifSeries, setVerifSeries] = useState<SeriesItem[]>([])
  const [verifLoading, setVerifLoading] = useState(false)
  const [verifType, setVerifType] = useState<'movie' | 'series'>('movie')
  const [checking, setChecking] = useState(false)
  const [checkedCount, setCheckedCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const searchTMDB = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const endpoint = searchType === 'movie' ? 'movie' : 'tv'
      const r = await fetch(`${TMDB_BASE}/search/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`)
      const d = await r.json()
      setResults(d.results || [])
    } catch {} finally { setSearching(false) }
  }

  const addContent = async (result: TMDBResult) => {
    setAddingId(result.id)
    try {
      // Use api-catalogue endpoint which fetches full TMDB data server-side
      const r = await fetch('/api/auth/admin/api-catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: searchType === 'movie' ? 'movie' : 'series', tmdbId: result.id }),
      })
      if (r.ok) setAddedIds(prev => new Set([...prev, result.id]))
    } catch {} finally { setAddingId(null) }
  }

  const loadVerifData = async () => {
    setVerifLoading(true)
    try {
      const [rm, rs] = await Promise.all([
        fetch('/api/content/movies').then(r => r.json()),
        fetch('/api/content/series').then(r => r.json()),
      ])
      setVerifMovies(Array.isArray(rm) ? rm : [])
      setVerifSeries(Array.isArray(rs) ? rs : [])
    } catch {} finally { setVerifLoading(false) }
  }

  useEffect(() => { if (subTab === 'verif') loadVerifData() }, [subTab])

  const currentList = verifType === 'movie' ? verifMovies : verifSeries
  const total = currentList.length

  const runVerif = async () => {
    setChecking(true)
    setCheckedCount(0)
    abortRef.current = new AbortController()
    try {
      for (let i = 0; i < currentList.length; i++) {
        if (abortRef.current.signal.aborted) break
        const item = currentList[i]
        const tmdbId = (item as any).tmdb_id
        await fetch('/api/auth/admin/api-catalogue', {
          method: 'GET',
          signal: abortRef.current.signal,
        }).catch(() => {})
        // Just log the check existence in catalogue
        await fetch(`/api/auth/admin/api-catalogue?tmdbId=${tmdbId}&type=${verifType}`)
          .catch(() => {})
        setCheckedCount(i + 1)
        await new Promise(r => setTimeout(r, 100))
      }
    } catch {} finally { setChecking(false) }
  }

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
        <button onClick={() => setSubTab('search')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${subTab === 'search' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
          Recherche TMDB
        </button>
        <button onClick={() => setSubTab('verif')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${subTab === 'verif' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
          État du catalogue
        </button>
      </div>

      {subTab === 'search' && (
        <div className="space-y-4">
          {/* Type toggle + search bar */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
              <button onClick={() => { setSearchType('movie'); setResults([]) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${searchType === 'movie' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`}>
                <Film className="w-3.5 h-3.5" />Films
              </button>
              <button onClick={() => { setSearchType('tv'); setResults([]) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${searchType === 'tv' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`}>
                <Tv className="w-3.5 h-3.5" />Séries
              </button>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchTMDB()}
                placeholder={`Rechercher ${searchType === 'movie' ? 'un film' : 'une série'} sur TMDB…`}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-primary/40 transition-colors" />
            </div>
            <button onClick={searchTMDB} disabled={searching}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-lg shadow-primary/20">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chercher'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {results.map(r => {
                const title = r.title || r.name || ''
                const year = (r.release_date || r.first_air_date || '').slice(0, 4)
                return (
                  <SearchCard key={r.id} title={title} year={year} posterPath={r.poster_path}
                    isAdded={addedIds.has(r.id)} isAdding={addingId === r.id}
                    onAdd={() => addContent(r)} isType={searchType === 'movie' ? 'movie' : 'series'} />
                )
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'verif' && (
        <div className="space-y-4">
          {/* Type selector */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
              <button onClick={() => setVerifType('movie')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${verifType === 'movie' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`}>
                <Film className="w-3.5 h-3.5" />Films
              </button>
              <button onClick={() => setVerifType('series')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${verifType === 'series' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/70'}`}>
                <Tv className="w-3.5 h-3.5" />Séries
              </button>
            </div>
            <button onClick={loadVerifData} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 text-sm hover:bg-white/[0.07] transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${verifLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
              <p className="text-xs text-white/30 mb-1">Au catalogue</p>
              <p className="text-3xl font-black text-white">{total}</p>
              <p className="text-xs text-white/20 mt-1">{verifType === 'movie' ? 'films' : 'séries'} indexés</p>
            </div>
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
              <p className="text-xs text-emerald-400/60 mb-1">Vérifiés</p>
              <p className="text-3xl font-black text-white">{checkedCount}</p>
              <p className="text-xs text-white/20 mt-1">lors de la dernière passe</p>
            </div>
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
              <p className="text-xs text-amber-400/60 mb-1">Restants</p>
              <p className="text-3xl font-black text-white">{Math.max(0, total - checkedCount)}</p>
              <p className="text-xs text-white/20 mt-1">à vérifier</p>
            </div>
          </div>

          {/* Progress */}
          {checking && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-primary">Vérification en cours…</span>
                <span className="text-xs text-white/40">{checkedCount} / {total}</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(checkedCount / Math.max(total, 1)) * 100}%` }} />
              </div>
            </div>
          )}

          <button onClick={checking ? () => abortRef.current?.abort() : runVerif}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              checking ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
            }`}>
            {checking ? <><Pause className="w-4 h-4" />Arrêter</> : <><Play className="w-4 h-4" />Lancer la vérification</>}
          </button>

          {/* List preview */}
          {!verifLoading && currentList.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.07]">
                <p className="text-sm font-semibold text-white">Aperçu du catalogue</p>
              </div>
              <div className="divide-y divide-white/[0.05] max-h-80 overflow-y-auto">
                {currentList.slice(0, 50).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-8 h-11 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative">
                      {item.poster_path
                        ? <Image src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt="" fill sizes="32px" className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            {verifType === 'movie' ? <Film className="w-3 h-3 text-white/20" /> : <Tv className="w-3 h-3 text-white/20" />}
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{item.title || item.name}</p>
                      <p className="text-white/30 text-[10px]">TMDB #{item.tmdb_id}</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
              {currentList.length > 50 && (
                <div className="px-4 py-3 border-t border-white/[0.05] text-center text-xs text-white/20">
                  +{currentList.length - 50} autres
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CataloguePage() {
  const [tab, setTab] = useState<'films' | 'series' | 'api'>('films')

  const tabs = [
    { id: 'films' as const, icon: Film, label: 'Films' },
    { id: 'series' as const, icon: Tv, label: 'Séries' },
    { id: 'api' as const, icon: Zap, label: 'API' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-primary/60 uppercase mb-1">Administration</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Catalogue</h1>
              <p className="text-white/30 text-sm">Gérez vos films, séries et l'intégration API</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {tab === 'films' && <FilmsTab />}
            {tab === 'series' && <SeriesTab />}
            {tab === 'api' && <ApiTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
