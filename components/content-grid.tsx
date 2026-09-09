'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useDrawer } from '@/components/movie-drawer'
import { Search, X, ChevronDown, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getPosterUrl, getBackdropUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'

interface ContentGridProps {
  title: string
  content: (Movie | Series)[]
  type: 'movie' | 'series'
}

type SortType = 'popular' | 'rating' | 'newest' | 'alpha'

const PAGE_SIZE = 42

const SORT_ALIASES: Record<string, SortType> = {
  popular: 'popular',
  popularity: 'popular',
  rating: 'rating',
  top: 'rating',
  newest: 'newest',
  new: 'newest',
  recent: 'newest',
  alpha: 'alpha',
}

const SORT_OPTIONS: { id: SortType; label: string }[] = [
  { id: 'popular', label: 'Populaires' },
  { id: 'rating', label: 'Mieux notés' },
  { id: 'newest', label: 'Plus récents' },
  { id: 'alpha', label: 'A → Z' },
]

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

function itemTitle(item: Movie | Series) {
  if (isMovie(item)) return (item.title || item.original_title || '').trim()
  return (item.name || item.original_name || '').trim()
}

function itemDate(item: Movie | Series) {
  return isMovie(item) ? item.release_date : item.first_air_date
}

function itemYear(item: Movie | Series) {
  const d = itemDate(item)
  if (!d) return ''
  const y = new Date(d).getFullYear()
  return Number.isFinite(y) ? String(y) : ''
}

function mapTmdbResult(r: any, type: 'movie' | 'series'): Movie | Series {
  if (type === 'movie') {
    return {
      id: r.id,
      tmdb_id: r.id,
      title: r.title || r.original_title || '',
      original_title: r.original_title || r.title || '',
      overview: r.overview || '',
      poster_path: r.poster_path || null,
      backdrop_path: r.backdrop_path || null,
      release_date: r.release_date || '',
      vote_average: r.vote_average || 0,
      vote_count: r.vote_count || 0,
      genre_ids: r.genre_ids || [],
      popularity: r.popularity || 0,
      adult: !!r.adult,
      video_url: null,
    }
  }
  return {
    id: r.id,
    tmdb_id: r.id,
    name: r.name || r.original_name || '',
    original_name: r.original_name || r.name || '',
    overview: r.overview || '',
    poster_path: r.poster_path || null,
    backdrop_path: r.backdrop_path || null,
    first_air_date: r.first_air_date || '',
    vote_average: r.vote_average || 0,
    vote_count: r.vote_count || 0,
    genre_ids: r.genre_ids || [],
    popularity: r.popularity || 0,
    number_of_seasons: r.number_of_seasons || 0,
    number_of_episodes: r.number_of_episodes || 0,
  }
}

export function ContentGrid({ title, content, type }: ContentGridProps) {
  const { openDrawer } = useDrawer()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sort = SORT_ALIASES[searchParams.get('sort') || ''] || 'popular'
  const selectedGenre = searchParams.get('genre') ? Number(searchParams.get('genre')) : null

  const [search, setSearch] = useState('')
  const [sortOpen, setSortOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loaderRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const [tmdbResults, setTmdbResults] = useState<(Movie | Series)[]>([])
  const [tmdbSearching, setTmdbSearching] = useState(false)
  const [tmdbPage, setTmdbPage] = useState(1)
  const [tmdbTotalPages, setTmdbTotalPages] = useState(0)
  const tmdbLoadingMore = useRef(false)
  const isTmdbSearch = search.trim().length > 0

  const setSort = useCallback((next: SortType) => {
    const p = new URLSearchParams(searchParams.toString())
    if (next === 'popular') p.delete('sort')
    else p.set('sort', next)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    setSortOpen(false)
  }, [pathname, router, searchParams])

  const setGenre = useCallback((id: number | null) => {
    const p = new URLSearchParams(searchParams.toString())
    if (!id) p.delete('genre')
    else p.set('genre', String(id))
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const allGenres = useMemo(() => {
    const genreMap: Record<number, string> = {}
    content.forEach(item => {
      item.genre_ids?.forEach(id => {
        const name = getGenreNames([id])[0]
        if (name) genreMap[id] = name
      })
    })
    return Object.entries(genreMap).sort((a, b) => a[1].localeCompare(b[1], 'fr'))
  }, [content])

  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setTmdbResults([])
      setTmdbSearching(false)
      setTmdbPage(1)
      setTmdbTotalPages(0)
      return
    }

    const ac = new AbortController()
    setTmdbSearching(true)
    setTmdbPage(1)
    setTmdbTotalPages(0)
    tmdbLoadingMore.current = false
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/tmdb/search?q=${encodeURIComponent(q)}&type=${type}&page=1`,
          { signal: ac.signal },
        )
        const data = await res.json()
        setTmdbResults((data.results || []).map((r: any) => mapTmdbResult(r, type)))
        setTmdbPage(1)
        setTmdbTotalPages(data.total_pages || 1)
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setTmdbResults([])
          setTmdbTotalPages(0)
        }
      } finally {
        if (!ac.signal.aborted) setTmdbSearching(false)
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [search, type])

  const filtered = useMemo(() => {
    let items = [...(isTmdbSearch ? tmdbResults : content)]
    if (selectedGenre) items = items.filter(item => item.genre_ids?.includes(selectedGenre))
    switch (sort) {
      case 'rating':
        items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        break
      case 'newest':
        items.sort((a, b) => new Date(itemDate(b) || 0).getTime() - new Date(itemDate(a) || 0).getTime())
        break
      case 'alpha':
        items.sort((a, b) => itemTitle(a).localeCompare(itemTitle(b), 'fr'))
        break
      default:
        items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    }
    return items
  }, [content, isTmdbSearch, tmdbResults, sort, selectedGenre])

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search, sort, selectedGenre])

  const visible = isTmdbSearch ? filtered : filtered.slice(0, visibleCount)
  const hasMore = isTmdbSearch ? tmdbPage < tmdbTotalPages : visibleCount < filtered.length

  const loadMore = useCallback(() => {
    if (isTmdbSearch) {
      if (tmdbLoadingMore.current || tmdbPage >= tmdbTotalPages) return
      const q = search.trim()
      if (!q) return
      tmdbLoadingMore.current = true
      const next = tmdbPage + 1
      fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}&type=${type}&page=${next}`)
        .then(r => r.json())
        .then(data => {
          setTmdbResults(prev => {
            const seen = new Set(prev.map(i => i.tmdb_id || i.id))
            const extra = (data.results || [])
              .map((r: any) => mapTmdbResult(r, type))
              .filter(i => !seen.has(i.tmdb_id || i.id))
            return [...prev, ...extra]
          })
          setTmdbPage(next)
        })
        .finally(() => { tmdbLoadingMore.current = false })
      return
    }
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
  }, [isTmdbSearch, tmdbPage, tmdbTotalPages, search, type, filtered.length])

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore) loadMore() },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const cover = useMemo(() => {
    return [...content]
      .filter(i => i.backdrop_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0]
  }, [content])

  const sortLabel = SORT_OPTIONS.find(o => o.id === sort)?.label || 'Populaires'

  return (
    <div className="pb-28 md:pb-16">
      <div className="relative h-[240px] md:h-[320px] overflow-hidden">
        {cover?.backdrop_path && (
          <Image
            src={getBackdropUrl(cover.backdrop_path)}
            alt=""
            fill
            priority
            className="object-cover object-top"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/50 to-black/40" />
        <div className="relative h-full max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col justify-end pb-6 pt-24">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">{title}</h1>
          <p className="text-white/50 text-sm mt-1">
            {isTmdbSearch
              ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} TMDB`
              : `${filtered.length} titre${filtered.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8">

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2.5 h-11 px-3.5 rounded-xl bg-white/[0.05] border border-white/10">
            <Search className="w-4 h-4 text-white/35 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Rechercher un ${type === 'movie' ? 'film' : 'série'}…`}
              className="flex-1 min-w-0 bg-transparent text-white text-sm outline-none placeholder-white/30"
            />
            {tmdbSearching ? (
              <Loader2 className="w-4 h-4 text-white/40 animate-spin shrink-0" />
            ) : search ? (
              <button type="button" onClick={() => setSearch('')} className="text-white/35 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          <div ref={sortRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSortOpen(o => !o)}
              className="h-11 px-3.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm font-medium inline-flex items-center gap-2"
            >
              {sortLabel}
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[180px] rounded-xl border border-white/10 bg-[#121214] py-1 shadow-xl">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSort(opt.id)}
                    className={`w-full text-left px-3.5 py-2 text-sm ${
                      sort === opt.id ? 'text-white bg-red-600/20' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-5 hide-scrollbar">
          <button
            type="button"
            onClick={() => setGenre(null)}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold ${
              !selectedGenre ? 'bg-red-600 text-white' : 'bg-white/[0.06] text-white/55 hover:text-white'
            }`}
          >
            Tous
          </button>
          {allGenres.map(([id, name]) => (
            <button
              key={id}
              type="button"
              onClick={() => setGenre(selectedGenre === +id ? null : +id)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold ${
                selectedGenre === +id ? 'bg-red-600 text-white' : 'bg-white/[0.06] text-white/55 hover:text-white'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {tmdbSearching && tmdbResults.length === 0 ? (
          <p className="text-center text-white/35 py-24">Recherche en cours…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-white/35 py-24">Aucun résultat</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-x-3 gap-y-6">
            {visible.map(item => {
              const t = itemTitle(item)
              const year = itemYear(item)
              const key = `${type}-${item.tmdb_id || item.id}`
              return (
                <button
                  key={key}
                  type="button"
                  className="group text-left"
                  onClick={() => openDrawer(type, item.tmdb_id || item.id)}
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900">
                    <Image
                      src={getPosterUrl(item.poster_path)}
                      alt={t}
                      fill
                      className="object-cover group-hover:scale-[1.04] transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, 14vw"
                    />
                  </div>
                  <p className="mt-2 text-white text-[13px] font-medium leading-snug line-clamp-2">{t}</p>
                  {year && <p className="text-white/35 text-xs mt-0.5">{year}</p>}
                </button>
              )
            })}
          </div>
        )}

        <div ref={loaderRef} className="h-12" />
      </div>
    </div>
  )
}
