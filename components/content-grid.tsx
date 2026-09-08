'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useDrawer } from '@/components/movie-drawer'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, LayoutGrid, List, X, ChevronRight, ChevronLeft, Shuffle, Play, Star, RotateCcw,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getPosterUrl, getBackdropUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'

interface ContentGridProps {
  title: string
  content: (Movie | Series)[]
  type: 'movie' | 'series'
}

type SortType = 'popular' | 'rating' | 'newest' | 'recent' | 'alpha'
type ViewType = 'grid' | 'list'

const PAGE_SIZE = 28

const SORT_ALIASES: Record<string, SortType> = {
  popular: 'popular',
  popularity: 'popular',
  rating: 'rating',
  top: 'rating',
  newest: 'newest',
  new: 'newest',
  recent: 'recent',
  alpha: 'alpha',
}

const SORT_LABELS: Record<SortType, string> = {
  popular: 'Populaires',
  rating: 'Mieux notés',
  newest: 'Plus récents',
  recent: 'Derniers ajouts',
  alpha: 'A → Z',
}

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

function itemTitle(item: Movie | Series) {
  if (isMovie(item)) return (item.title || item.original_title || '').trim()
  return (item.name || item.original_name || '').trim()
}

function itemOriginal(item: Movie | Series) {
  if (isMovie(item)) return (item.original_title || '').trim()
  return (item.original_name || '').trim()
}

function itemDate(item: Movie | Series) {
  return isMovie(item) ? item.release_date : item.first_air_date
}

function itemYear(item: Movie | Series) {
  const d = itemDate(item)
  return d ? new Date(d).getFullYear() : 0
}

export function ContentGrid({ title, content, type }: ContentGridProps) {
  const { openDrawer } = useDrawer()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sort = SORT_ALIASES[searchParams.get('sort') || ''] || 'popular'
  const view: ViewType = searchParams.get('view') === 'list' ? 'list' : 'grid'
  const selectedGenre = searchParams.get('genre') ? Number(searchParams.get('genre')) : null
  const decade = searchParams.get('decade') ? Number(searchParams.get('decade')) : null
  const urlQuery = searchParams.get('q') || ''

  const [search, setSearch] = useState(urlQuery)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroPaused, setHeroPaused] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)
  const genreScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSearch(urlQuery) }, [urlQuery])

  const setParams = useCallback((patch: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (!v) p.delete(k)
      else p.set(k, v)
    }
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== urlQuery) setParams({ q: search.trim() || null })
    }, 350)
    return () => clearTimeout(t)
  }, [search, urlQuery, setParams])

  const allGenres = useMemo(() => {
    const genreMap: Record<number, string> = {}
    content.forEach(item => {
      item.genre_ids?.forEach(id => {
        const names = getGenreNames([id])
        if (names[0]) genreMap[id] = names[0]
      })
    })
    return Object.entries(genreMap).sort((a, b) => a[1].localeCompare(b[1], 'fr'))
  }, [content])

  const decades = useMemo(() => {
    const set = new Set<number>()
    content.forEach(item => {
      const y = itemYear(item)
      if (y >= 1950) set.add(Math.floor(y / 10) * 10)
    })
    return [...set].sort((a, b) => b - a)
  }, [content])

  const featured = useMemo(() => (
    [...content]
      .filter(i => i.backdrop_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 6)
  ), [content])

  const hero = featured[heroIndex] || featured[0]

  useEffect(() => {
    if (featured.length <= 1 || heroPaused) return
    const id = setInterval(() => setHeroIndex(i => (i + 1) % featured.length), 7000)
    return () => clearInterval(id)
  }, [featured.length, heroPaused])

  const filtered = useMemo(() => {
    let items = [...content]
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(item => {
        const t = itemTitle(item).toLowerCase()
        const o = itemOriginal(item).toLowerCase()
        return t.includes(q) || o.includes(q)
      })
    }
    if (selectedGenre) items = items.filter(item => item.genre_ids?.includes(selectedGenre))
    if (decade) {
      items = items.filter(item => {
        const y = itemYear(item)
        return y >= decade && y < decade + 10
      })
    }
    switch (sort) {
      case 'rating':
        items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        break
      case 'newest':
        items.sort((a, b) => new Date(itemDate(b) || 0).getTime() - new Date(itemDate(a) || 0).getTime())
        break
      case 'recent':
        items.sort((a, b) => (b.id || 0) - (a.id || 0))
        break
      case 'alpha':
        items.sort((a, b) => itemTitle(a).localeCompare(itemTitle(b), 'fr'))
        break
      default:
        items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    }
    return items
  }, [content, search, sort, selectedGenre, decade])

  const spotlight = useMemo(() => filtered.slice(0, 12), [filtered])
  const hasActiveFilters = !!(search.trim() || selectedGenre || decade)

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search, sort, selectedGenre, decade, view])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
  }, [filtered.length])

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore) loadMore() },
      { rootMargin: '280px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const openItem = (item: Movie | Series) => openDrawer(type, item.tmdb_id || item.id)

  const pickRandom = () => {
    if (!filtered.length) return
    const item = filtered[Math.floor(Math.random() * filtered.length)]
    openItem(item)
  }

  const resetFilters = () => {
    setSearch('')
    router.replace(pathname, { scroll: false })
  }

  const breadcrumbLabel = type === 'movie' ? 'FILMS' : 'SÉRIES'
  const accent = type === 'movie' ? '#e53935' : '#a78bfa'
  const genreName = selectedGenre ? getGenreNames([selectedGenre])[0] : null

  return (
    <div className="pb-16">
      {/* Hero */}
      {hero && (
        <section
          className="relative w-full overflow-hidden"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
        >
          <div className="relative h-[58vh] min-h-[420px] max-h-[640px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={hero.tmdb_id || hero.id}
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className="absolute inset-0"
              >
                <Image
                  src={getBackdropUrl(hero.backdrop_path)}
                  alt={itemTitle(hero)}
                  fill
                  priority
                  className="object-cover object-top"
                  sizes="100vw"
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-r from-[#08080a] via-[#08080a]/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/25 to-black/40" />

            <div className="relative h-full max-w-[1400px] mx-auto px-5 md:px-8 flex flex-col justify-end pb-10 pt-28">
              <div className="flex items-center gap-2 text-[11px] text-white/40 uppercase tracking-[0.22em] mb-4">
                <Link href="/" className="hover:text-white/70 transition-colors">Accueil</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white/70">{breadcrumbLabel}</span>
              </div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: accent }}>
                {type === 'movie' ? 'À l’affiche' : 'En ce moment'}
              </p>
              <h1 className="text-4xl md:text-6xl font-black text-white max-w-3xl leading-[0.95] mb-3 drop-shadow-lg">
                {itemTitle(hero)}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/70 mb-4">
                {itemYear(hero) > 0 && <span>{itemYear(hero)}</span>}
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {hero.vote_average?.toFixed(1)}
                </span>
                {getGenreNames(hero.genre_ids || []).slice(0, 3).map(g => (
                  <span key={g} className="px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-[11px]">{g}</span>
                ))}
              </div>
              {hero.overview && (
                <p className="text-white/55 text-sm md:text-[15px] max-w-xl line-clamp-3 mb-6 leading-relaxed">
                  {hero.overview}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => openItem(hero)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors"
                >
                  <Play className="w-4 h-4 fill-black" />
                  Voir
                </button>
                <button
                  onClick={pickRandom}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/15 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
                >
                  <Shuffle className="w-4 h-4" />
                  Au hasard
                </button>
                <span className="text-white/35 text-sm ml-1">{content.length} titres</span>
              </div>

              {featured.length > 1 && (
                <div className="flex gap-1.5 mt-6">
                  {featured.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => setHeroIndex(i)}
                      className="h-1 rounded-full transition-all"
                      style={{
                        width: i === heroIndex ? 28 : 10,
                        background: i === heroIndex ? accent : 'rgba(255,255,255,0.25)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        {!hero && (
          <div className="pt-28 mb-6">
            <h1 className="text-4xl font-black text-white">{title}</h1>
          </div>
        )}

        {/* Sticky filters */}
        <div className="sticky top-[72px] z-30 -mx-5 md:-mx-8 px-5 md:px-8 py-3 mb-5 backdrop-blur-xl bg-[#08080a]/85 border-b border-white/[0.06]">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 flex items-center gap-3 rounded-2xl px-4 h-11 border border-white/10 bg-white/[0.04]">
              <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Rechercher un${type === 'movie' ? ' film' : 'e série'} (titre FR ou original)…`}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/25"
              />
              {search && (
                <button onClick={() => { setSearch(''); setParams({ q: null }) }}>
                  <X className="w-4 h-4 text-white/30 hover:text-white" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {(Object.keys(SORT_LABELS) as SortType[]).map(s => (
                <button
                  key={s}
                  onClick={() => setParams({ sort: s === 'popular' ? null : s })}
                  className={`flex-shrink-0 px-3.5 h-11 rounded-xl text-sm font-semibold transition-all ${
                    sort === s
                      ? 'bg-white text-black'
                      : 'text-white/45 hover:text-white border border-white/10 bg-white/[0.03]'
                  }`}
                >
                  {SORT_LABELS[s]}
                </button>
              ))}
              <div className="flex items-center rounded-xl border border-white/10 p-1 bg-white/[0.03]">
                <button onClick={() => setParams({ view: null })} className={`p-2 rounded-lg ${view === 'grid' ? 'bg-white/15 text-white' : 'text-white/30'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setParams({ view: 'list' })} className={`p-2 rounded-lg ${view === 'list' ? 'bg-white/15 text-white' : 'text-white/30'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Genres */}
        <div className="relative mb-4">
          <button
            onClick={() => genreScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-8 h-8 items-center justify-center rounded-full bg-black/70 border border-white/10 text-white/70"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div ref={genreScrollRef} className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <button
              onClick={() => setParams({ genre: null })}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${!selectedGenre ? 'bg-white text-black' : 'bg-white/8 text-white/55 hover:bg-white/12'}`}
            >
              Tous
            </button>
            {allGenres.map(([id, name]) => (
              <button
                key={id}
                onClick={() => setParams({ genre: selectedGenre === +id ? null : id })}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedGenre === +id ? 'bg-white text-black' : 'bg-white/8 text-white/55 hover:bg-white/12'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Decades */}
        {decades.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-6 hide-scrollbar">
            <button
              onClick={() => setParams({ decade: null })}
              className={`flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-semibold ${!decade ? 'text-white bg-white/10' : 'text-white/40 hover:text-white/70'}`}
            >
              Toutes les années
            </button>
            {decades.map(d => (
              <button
                key={d}
                onClick={() => setParams({ decade: decade === d ? null : String(d) })}
                className={`flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-semibold ${
                  decade === d ? 'text-white bg-white/10' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-5">
          <p className="text-sm text-white/40">
            <span className="text-white font-semibold">{filtered.length}</span>
            {' '}{type === 'movie' ? 'film' : 'série'}{filtered.length > 1 ? 's' : ''}
            {genreName ? ` · ${genreName}` : ''}
            {decade ? ` · ${decade}s` : ''}
            {search.trim() ? ` · « ${search.trim()} »` : ''}
          </p>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
              <RotateCcw className="w-3 h-3" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Spotlight row when browsing without search */}
        {!hasActiveFilters && view === 'grid' && spotlight.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-white mb-3">Les plus populaires</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {spotlight.map(item => (
                <button key={item.id} onClick={() => openItem(item)} className="flex-shrink-0 w-[128px] text-left group">
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2">
                    <Image src={getPosterUrl(item.poster_path)} alt={itemTitle(item)} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="128px" />
                  </div>
                  <p className="text-white text-xs font-semibold line-clamp-2">{itemTitle(item)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-24 rounded-3xl border border-white/[0.06] bg-white/[0.02]">
            <p className="text-white text-lg font-semibold mb-1">Aucun résultat</p>
            <p className="text-white/35 text-sm mb-5">Essaie un autre titre, genre ou décennie.</p>
            <button onClick={resetFilters} className="px-4 py-2 rounded-full bg-white text-black text-sm font-bold">
              Voir tout le catalogue
            </button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {visible.map((item, i) => {
              const t = itemTitle(item)
              const year = itemYear(item)
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min((i % PAGE_SIZE) * 0.012, 0.2) }}
                >
                  <button className="group w-full text-left" onClick={() => openItem(item)}>
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2">
                      <Image src={getPosterUrl(item.poster_path)} alt={t} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="14vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <p className="text-white text-[11px] font-bold line-clamp-2">{t}</p>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-amber-300 text-[10px] font-bold">
                        ★ {item.vote_average?.toFixed(1)}
                      </div>
                    </div>
                    <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">{t}</p>
                    {year > 0 && <p className="text-white/30 text-[11px] mt-0.5">{year}</p>}
                  </button>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((item, i) => {
              const t = itemTitle(item)
              const year = itemYear(item)
              const genres = getGenreNames(item.genre_ids || []).slice(0, 3)
              const original = itemOriginal(item)
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: Math.min((i % PAGE_SIZE) * 0.01, 0.15) }}
                >
                  <button
                    className="w-full flex items-center gap-4 p-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/15 rounded-2xl transition-all group text-left"
                    onClick={() => openItem(item)}
                  >
                    <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                      <Image src={getPosterUrl(item.poster_path)} alt={t} fill className="object-cover" sizes="48px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate group-hover:text-primary transition-colors">{t}</p>
                      {original && original !== t && (
                        <p className="text-white/30 text-[11px] truncate">{original}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {year > 0 && <span className="text-white/40 text-xs">{year}</span>}
                        {genres.map(g => <span key={g} className="text-white/30 text-xs">· {g}</span>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 text-sm font-bold flex-shrink-0">
                      ★ {item.vote_average?.toFixed(1)}
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}

        <div ref={loaderRef} className="flex justify-center py-8">
          {hasMore && (
            <div className="flex items-center gap-2 text-white/30 text-sm">
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
              Chargement…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
