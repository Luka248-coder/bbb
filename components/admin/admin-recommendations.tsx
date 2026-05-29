'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Film, Tv, Star, TrendingUp, Trophy, RefreshCw,
  Plus, Check, Loader2, Calendar, Users,
} from 'lucide-react'
import Image from 'next/image'

const IMG_BASE = 'https://image.tmdb.org/t/p/w342'

interface TMDBItem {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  vote_average: number
  vote_count: number
  popularity: number
  release_date?: string
  first_air_date?: string
  overview: string
  genre_ids: number[]
}

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime',
  99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 14: 'Fantasy', 27: 'Horreur',
  9648: 'Mystère', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller', 37: 'Western',
  10759: 'Action/Aventure', 10762: 'Enfants', 10765: 'Sci-Fi/Fantasy', 10768: 'Guerre'
}

const CATEGORIES = [
  { id: 'trending', label: 'Tendances', icon: TrendingUp, color: 'text-orange-400', desc: 'Les plus populaires du moment' },
  { id: 'top_rated', label: 'Mieux notés', icon: Trophy, color: 'text-yellow-400', desc: 'Notes TMDB les plus élevées' },
  { id: 'popular', label: 'Populaires', icon: Users, color: 'text-blue-400', desc: 'Les plus vus en ce moment' },
  { id: 'upcoming', label: 'À venir', icon: Calendar, color: 'text-green-400', desc: 'Prochaines sorties films' },
]

export function AdminRecommendations() {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie')
  const [category, setCategory] = useState('trending')
  const [items, setItems] = useState<TMDBItem[]>([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<number[]>([])
  const [urlPromptId, setUrlPromptId] = useState<number | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [existingMovieIds, setExistingMovieIds] = useState<number[]>([])
  const [existingSeriesIds, setExistingSeriesIds] = useState<number[]>([])

  useEffect(() => {
    fetch('/api/auth/admin/tmdb-recommendations?catalog=1')
      .then(r => r.json())
      .then(d => {
        setExistingMovieIds(d.movieIds || [])
        setExistingSeriesIds(d.seriesIds || [])
      })
      .catch(() => {})
  }, [])

  const existingIds = mediaType === 'movie' ? existingMovieIds : existingSeriesIds

  const fetchRecommendations = useCallback(async () => {
    setLoading(true)
    setItems([])
    try {
      const res = await fetch(`/api/auth/admin/tmdb-recommendations?category=${category}&type=${mediaType}`)
      const data = await res.json()
      setItems(data.results || [])
    } catch {}
    setLoading(false)
  }, [mediaType, category])

  useEffect(() => { fetchRecommendations() }, [fetchRecommendations])

  const addItem = async (item: TMDBItem, videoUrl?: string) => {
    setAddingId(item.id)
    setUrlPromptId(null)
    setUrlInput('')
    try {
      const isMovie = mediaType === 'movie'
      const tmdbData = {
        id: item.id,
        title: isMovie ? item.title : item.name,
        name: item.name,
        overview: item.overview,
        poster_path: item.poster_path,
        backdrop_path: null,
        release_date: item.release_date,
        first_air_date: item.first_air_date,
        vote_average: item.vote_average,
        vote_count: item.vote_count,
        genre_ids: item.genre_ids,
        popularity: item.popularity,
      }
      const res = await fetch('/api/auth/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isMovie ? 'movie' : 'series',
          tmdbData,
          videoUrl: videoUrl || null
        }),
      })
      if (res.ok) setAddedIds(prev => [...prev, item.id])
    } catch {}
    setAddingId(null)
  }

  const isExisting = (id: number) => existingIds.includes(id) || addedIds.includes(id)
  const formatDate = (d?: string) => d ? new Date(d).getFullYear() : ''

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Recommandations TMDB</h1>
            <p className="text-sm text-muted-foreground">Films et séries populaires à ajouter à votre catalogue</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex p-1 rounded-xl gap-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setMediaType('movie')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mediaType === 'movie' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
          >
            <Film className="w-4 h-4" /> Films
          </button>
          <button
            onClick={() => setMediaType('tv')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mediaType === 'tv' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
          >
            <Tv className="w-4 h-4" /> Séries
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter(c => !(c.id === 'upcoming' && mediaType === 'tv')).map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  category === cat.id
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${cat.color}`} />
                {cat.label}
              </button>
            )
          })}
        </div>

        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-white border border-white/10 hover:border-white/20 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {(() => {
        const cat = CATEGORIES.find(c => c.id === category)
        if (!cat) return null
        const Icon = cat.icon
        return (
          <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Icon className={`w-4 h-4 ${cat.color}`} />
            <p className="text-sm text-muted-foreground">{cat.desc} — {mediaType === 'movie' ? 'Films' : 'Séries'}</p>
            {!loading && <span className="ml-auto text-xs text-muted-foreground">{items.filter(i => !isExisting(i.id)).length} à ajouter</span>}
          </div>
        )
      })()}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Chargement des recommandations…</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Sparkles className="w-10 h-10 text-white/10" />
          <p className="text-muted-foreground text-sm">Aucun résultat</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          <AnimatePresence mode="popLayout">
            {items.map((item, i) => {
              const label = item.title || item.name || ''
              const date = formatDate(item.release_date || item.first_air_date)
              const alreadyIn = isExisting(item.id)
              const isAdding = addingId === item.id
              const genres = item.genre_ids.slice(0, 2).map(id => GENRE_MAP[id]).filter(Boolean)

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative flex flex-col"
                >
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3"
                    style={{
                      border: alreadyIn ? '2px solid rgba(34,197,94,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      background: 'rgba(255,255,255,0.04)'
                    }}>
                    {item.poster_path ? (
                      <Image
                        src={`${IMG_BASE}${item.poster_path}`}
                        alt={label}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="200px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-10 h-10 text-white/10" />
                      </div>
                    )}

                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />

                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-white">{item.vote_average.toFixed(1)}</span>
                    </div>

                    {alreadyIn && (
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(34,197,94,0.9)' }}>
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}

                    {!alreadyIn && (
                      <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                        {urlPromptId === item.id ? (
                          <div className="flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={urlInput}
                              onChange={e => setUrlInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') addItem(item, urlInput)
                                if (e.key === 'Escape') { setUrlPromptId(null); setUrlInput('') }
                              }}
                              placeholder="https://... (optionnel)"
                              className="w-full text-[11px] px-2.5 py-1.5 rounded-lg outline-none text-white placeholder-white/30"
                              style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => addItem(item, urlInput)}
                                disabled={isAdding}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold text-white active:scale-95 transition-all"
                                style={{ background: 'rgba(220,38,38,0.9)' }}
                              >
                                {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Confirmer</>}
                              </button>
                              <button
                                onClick={() => { setUrlPromptId(null); setUrlInput('') }}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white transition-all"
                                style={{ background: 'rgba(255,255,255,0.08)' }}
                              >✕</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (mediaType === 'movie') {
                                setUrlPromptId(item.id)
                                setUrlInput('')
                              } else {
                                addItem(item)
                              }
                            }}
                            disabled={isAdding}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                            style={{ background: 'rgba(220,38,38,0.9)', backdropFilter: 'blur(8px)' }}
                          >
                            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Ajouter</>}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-white text-xs font-semibold leading-tight mb-1 line-clamp-2">{label}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {date && <span className="text-white/30 text-[11px] font-medium">{date}</span>}
                    {genres.map(g => (
                      <span key={g} className="text-[10px] text-white/25 uppercase tracking-wide">{g}</span>
                    ))}
                  </div>

                  <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min((item.popularity / 300) * 100, 100)}%`,
                      background: 'linear-gradient(90deg, rgba(220,38,38,0.6), rgba(220,38,38,0.3))'
                    }} />
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
