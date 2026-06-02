'use client'

import { useState, useMemo } from 'react'
import { useDrawer } from '@/components/movie-drawer'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, LayoutGrid, List, SlidersHorizontal, X, Home, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getPosterUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'

interface ContentGridProps {
  title: string
  content: (Movie | Series)[]
  type: 'movie' | 'series'
}

type SortType = 'recent' | 'rating' | 'newest' | 'alpha'
type ViewType = 'grid' | 'list'

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

export function ContentGrid({ title, content, type }: ContentGridProps) {
  const { openDrawer } = useDrawer()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortType>('rating')
  const [view, setView] = useState<ViewType>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)

  // Get all genres from content
  const allGenres = useMemo(() => {
    const genreMap: Record<number, string> = {}
    content.forEach(item => {
      item.genre_ids?.forEach(id => {
        const names = getGenreNames([id])
        if (names[0]) genreMap[id] = names[0]
      })
    })
    return Object.entries(genreMap).sort((a, b) => a[1].localeCompare(b[1]))
  }, [content])

  const filtered = useMemo(() => {
    let items = [...content]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(item => {
        const t = isMovie(item) ? item.title : (item as Series).name
        return t.toLowerCase().includes(q)
      })
    }

    // Genre filter
    if (selectedGenre) {
      items = items.filter(item => item.genre_ids?.includes(selectedGenre))
    }

    // Sort
    switch (sort) {
      case 'rating':
        items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        break
      case 'newest':
        items.sort((a, b) => {
          const da = isMovie(a) ? a.release_date : (a as Series).first_air_date
          const db = isMovie(b) ? b.release_date : (b as Series).first_air_date
          return new Date(db || 0).getTime() - new Date(da || 0).getTime()
        })
        break
      case 'recent':
        items.sort((a, b) => (b.id || 0) - (a.id || 0))
        break
      case 'alpha':
        items.sort((a, b) => {
          const ta = isMovie(a) ? a.title : (a as Series).name
          const tb = isMovie(b) ? b.title : (b as Series).name
          return ta.localeCompare(tb)
        })
        break
    }

    return items
  }, [content, search, sort, selectedGenre])

  const sortLabels: Record<SortType, string> = {
    recent: 'Derniers ajouts',
    rating: 'Mieux notés',
    newest: 'Plus récents',
    alpha: 'Alphabétique',
  }

  const breadcrumbLabel = type === 'movie' ? 'FILMS' : 'SÉRIES'
  const accentColor = type === 'movie' ? 'bg-primary' : 'bg-purple-500'

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-white/30 uppercase tracking-widest mb-4">
        <Link href="/" className="hover:text-white/60 transition-colors">ACCUEIL</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-white/60">{breadcrumbLabel}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-[3px] rounded-full self-stretch" style={{ background: type === 'movie' ? 'linear-gradient(to bottom, #e53935, transparent)' : 'linear-gradient(to bottom, #7c3aed, transparent)', minHeight: '2rem' }} />
            <h1 className="text-4xl font-black text-white">{title}</h1>
          </div>
          <p className="text-white/30 text-sm ml-4">
            {filtered.length} {type === 'movie' ? 'titre' : 'série'}{filtered.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          <button onClick={() => setView('grid')}
            className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3">
          <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Rechercher un${type === 'movie' ? ' film' : 'e série'}...`}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/20"
          />
          {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-white/30 hover:text-white" /></button>}
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {(Object.keys(sortLabels) as SortType[]).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                sort === s ? 'bg-white/15 text-white border border-white/20' : 'text-white/40 hover:text-white/70'
              }`}>
              {sortLabels[s]}
            </button>
          ))}

          {/* Filters */}
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              showFilters || selectedGenre ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-white/40 hover:text-white/70 border border-white/10'
            }`}>
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
            {selectedGenre && <span className="w-2 h-2 bg-primary rounded-full" />}
          </button>
        </div>
      </div>

      {/* Genre filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6">
            <div className="flex flex-wrap gap-2 py-2">
              <button onClick={() => setSelectedGenre(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!selectedGenre ? 'bg-primary text-white' : 'bg-white/10 text-white/50 hover:bg-white/15'}`}>
                Tous
              </button>
              {allGenres.map(([id, name]) => (
                <button key={id} onClick={() => setSelectedGenre(selectedGenre === +id ? null : +id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedGenre === +id ? 'bg-primary text-white' : 'bg-white/10 text-white/50 hover:bg-white/15'}`}>
                  {name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid view */}
      {view === 'grid' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {filtered.map((item, i) => {
            const title = isMovie(item) ? item.title : (item as Series).name
            const date = isMovie(item) ? item.release_date : (item as Series).first_air_date
            const year = date ? new Date(date).getFullYear() : ''
            const tmdbId = item.tmdb_id || item.id
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }}>
                <div className="group cursor-pointer" onClick={() => openDrawer(type, tmdbId)}>
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2">
                      <Image src={getPosterUrl(item.poster_path)} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="14vw" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-white/70 text-[10px] font-bold">
                        ★ {item.vote_average?.toFixed(1)}
                      </div>
                    </div>
                    <p className="text-white text-xs font-semibold truncate">{title}</p>
                    {year && <p className="text-white/30 text-xs">{year}</p>}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {filtered.map((item, i) => {
            const title = isMovie(item) ? item.title : (item as Series).name
            const date = isMovie(item) ? item.release_date : (item as Series).first_air_date
            const year = date ? new Date(date).getFullYear() : ''
            const tmdbId = item.tmdb_id || item.id
            const genres = getGenreNames(item.genre_ids || []).slice(0, 2)
            return (
              <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.01 }}>
                <div className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/8 border border-white/5 hover:border-white/15 rounded-xl transition-all group cursor-pointer" onClick={() => openDrawer(type, tmdbId)}>
                    <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                      <Image src={getPosterUrl(item.poster_path)} alt={title} fill className="object-cover" sizes="48px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate group-hover:text-primary transition-colors">{title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {year && <span className="text-white/40 text-xs">{year}</span>}
                        {genres.map(g => <span key={g} className="text-white/30 text-xs">· {g}</span>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold flex-shrink-0">
                      ★ {item.vote_average?.toFixed(1)}
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/20 text-lg">Aucun résultat</p>
        </div>
      )}
    </div>
  )
}
