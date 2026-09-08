'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useDrawer } from '@/components/movie-drawer'
import { Search, X, ChevronDown } from 'lucide-react'
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

function itemOriginal(item: Movie | Series) {
  if (isMovie(item)) return (item.original_title || '').trim()
  return (item.original_name || '').trim()
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
  }, [content, search, sort, selectedGenre])

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search, sort, selectedGenre])

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
          <p className="text-white/50 text-sm mt-1">{filtered.length} titre{filtered.length > 1 ? 's' : ''}</p>
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
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-white/35 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
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

        {filtered.length === 0 ? (
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
