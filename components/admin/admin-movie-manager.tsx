'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Film, Search, Plus, Trash2, Edit, Star, Loader2, X, Check,
  Link as LinkIcon, AlertCircle, ChevronDown
} from 'lucide-react'
import Image from 'next/image'

interface TMDBResult {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  vote_average: number
  genre_ids: number[]
  popularity: number
  original_title?: string
  vote_count: number
}

interface MovieItem {
  id: number
  tmdb_id: number
  title: string
  poster_path: string | null
  vote_average: number
  release_date?: string
  video_url: string | null
}

interface AdminMovieManagerProps {
  items: MovieItem[]
}

export function AdminMovieManager({ items: initial }: AdminMovieManagerProps) {
  const [items, setItems] = useState<MovieItem[]>(initial)
  const [filter, setFilter] = useState('')
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<number[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [videoUrls, setVideoUrls] = useState<Record<number, string>>({})

  const searchTMDB = async () => {
    if (!tmdbQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/auth/admin/tmdb-search?q=${encodeURIComponent(tmdbQuery)}&type=movie`)
      const data = await res.json()
      setTmdbResults(data.results || [])
    } catch {}
    setSearching(false)
  }

  const addMovie = async (result: TMDBResult) => {
    setAddingId(result.id)
    try {
      const res = await fetch('/api/auth/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'movie', tmdbData: result, videoUrl: videoUrls[result.id] || null }),
      })
      if (res.ok) {
        const data = await res.json()
        setItems(prev => prev.find(i => i.tmdb_id === result.id) ? prev : [data, ...prev])
        setAddedIds(prev => [...prev, result.id])
      }
    } catch {}
    setAddingId(null)
  }

  const saveUrl = async (item: MovieItem) => {
    setSavingId(item.id)
    try {
      const res = await fetch('/api/auth/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'movie', tmdbId: item.tmdb_id, videoUrl: editUrl }),
      })
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, video_url: editUrl } : i))
        setEditId(null)
        setEditUrl('')
      }
    } catch {}
    setSavingId(null)
  }

  const deleteMovie = async (item: MovieItem) => {
    if (!confirm(`Supprimer "${item.title}" ?`)) return
    setDeletingId(item.id)
    try {
      const res = await fetch(`/api/auth/admin/content?type=movie&tmdbId=${item.tmdb_id}`, { method: 'DELETE' })
      if (res.ok) setItems(prev => prev.filter(i => i.id !== item.id))
    } catch {}
    setDeletingId(null)
  }

  const filtered = items.filter(i => i.title.toLowerCase().includes(filter.toLowerCase()))
  const withUrl = items.filter(i => i.video_url).length

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Film className="w-5 h-5 text-primary" />
            </div>
            Films
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} film{items.length > 1 ? 's' : ''} · {withUrl} avec lien vidéo
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setTmdbResults([]) }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Ajouter un film
        </button>
      </div>

      {/* Add panel */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }} className="overflow-hidden mb-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-sm">Rechercher sur TMDB</p>
                <button onClick={() => { setShowAdd(false); setTmdbResults([]) }}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 flex items-center gap-2 bg-secondary rounded-xl px-3 border border-border focus-within:border-primary/50 transition-colors">
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    value={tmdbQuery}
                    onChange={e => setTmdbQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchTMDB()}
                    placeholder="Nom du film..."
                    className="flex-1 bg-transparent py-2.5 text-sm outline-none text-foreground placeholder-muted-foreground"
                  />
                </div>
                <button onClick={searchTMDB} disabled={searching}
                  className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              {/* Results */}
              <AnimatePresence>
                {tmdbResults.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {tmdbResults.map(r => {
                      const year = r.release_date ? new Date(r.release_date).getFullYear() : ''
                      const isAdded = addedIds.includes(r.id) || items.some(i => i.tmdb_id === r.id)
                      return (
                        <div key={r.id} className="flex gap-3 p-3 bg-secondary/50 rounded-xl border border-border hover:border-primary/30 transition-colors">
                          <div className="relative w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
                            {r.poster_path && <Image src={`https://image.tmdb.org/t/p/w92${r.poster_path}`} alt={r.title} fill className="object-cover" sizes="40px" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{r.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 mb-2">
                              {year && <span className="text-muted-foreground text-xs">{year}</span>}
                              <span className="text-muted-foreground text-xs flex items-center gap-0.5">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{r.vote_average?.toFixed(1)}
                              </span>
                            </div>
                            {/* URL input inline */}
                            <input
                              value={videoUrls[r.id] || ''}
                              onChange={e => setVideoUrls(prev => ({ ...prev, [r.id]: e.target.value }))}
                              placeholder="Lien MP4 (optionnel)"
                              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors"
                            />
                          </div>
                          <button
                            onClick={() => !isAdded && addMovie(r)}
                            disabled={addingId === r.id || isAdded}
                            className={`self-center px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                              isAdded ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                              'bg-primary text-white hover:bg-primary/90'
                            }`}
                          >
                            {addingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                              isAdded ? <><Check className="w-3.5 h-3.5" />Ajouté</> :
                              <><Plus className="w-3.5 h-3.5" />Ajouter</>}
                          </button>
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search filter */}
      <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 border border-border focus-within:border-primary/50 transition-colors mb-6">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filtrer les films..."
          className="flex-1 bg-transparent py-2.5 text-sm outline-none text-foreground placeholder-muted-foreground"
        />
        {filter && <button onClick={() => setFilter('')}><X className="w-4 h-4 text-muted-foreground" /></button>}
      </div>

      {/* Movies grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <AnimatePresence>
          {filtered.map((item, i) => {
            const year = item.release_date ? new Date(item.release_date).getFullYear() : ''
            const hasUrl = !!item.video_url
            const isEditing = editId === item.id
            const isDeleting = deletingId === item.id
            const isSaving = savingId === item.id

            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.02 }}>
                <div className={`bg-card border rounded-2xl overflow-hidden transition-colors ${hasUrl ? 'border-border' : 'border-border'} hover:border-primary/30`}>
                  <div className="flex gap-3 p-3">
                    {/* Poster */}
                    <div className="relative w-14 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-secondary">
                      {item.poster_path && (
                        <Image src={`https://image.tmdb.org/t/p/w185${item.poster_path}`} alt={item.title} fill className="object-cover" sizes="56px" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <h3 className="font-bold text-sm text-foreground truncate">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5 mb-2">
                        {year && <span className="text-muted-foreground text-xs">{year}</span>}
                        <span className="text-xs flex items-center gap-0.5 text-muted-foreground">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{item.vote_average?.toFixed(1) ?? 'N/A'}
                        </span>
                      </div>

                      {/* URL status / editor */}
                      {isEditing ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            value={editUrl}
                            onChange={e => setEditUrl(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50 transition-colors min-w-0"
                          />
                          <button onClick={() => saveUrl(item)} disabled={isSaving}
                            className="px-2 py-1 bg-primary text-white rounded-lg text-xs">
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </button>
                          <button onClick={() => { setEditId(null); setEditUrl('') }}
                            className="px-2 py-1 bg-secondary border border-border rounded-lg text-xs">
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div
                            onClick={() => { setEditId(item.id); setEditUrl(item.video_url || '') }}
                            className={`flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer text-xs font-medium truncate border transition-colors ${
                              hasUrl
                                ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/15'
                                : 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/15'
                            }`}
                          >
                            <LinkIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{hasUrl ? 'Lien défini ✓' : 'Ajouter un lien'}</span>
                          </div>
                          <button
                            onClick={() => deleteMovie(item)}
                            disabled={isDeleting}
                            className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                          >
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <Film className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-30" />
          <p className="text-muted-foreground">
            {items.length === 0 ? 'Aucun film — cliquez sur "Ajouter un film"' : 'Aucun résultat'}
          </p>
        </div>
      )}
    </div>
  )
}