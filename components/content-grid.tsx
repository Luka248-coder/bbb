'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useDrawer } from '@/components/movie-drawer'
import { Search, X } from 'lucide-react'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getPosterUrl, getBackdropUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'

interface ContentGridProps {
  title: string
  content: (Movie | Series)[]
  type: 'movie' | 'series'
}

type SortType = 'popular' | 'rating' | 'newest' | 'recent' | 'alpha'

const PAGE_SIZE = 35

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

export function ContentGrid({ title, content, type }: ContentGridProps) {
  const { openDrawer } = useDrawer()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sort = SORT_ALIASES[searchParams.get('sort') || ''] || 'popular'
  const selectedGenre = searchParams.get('genre') ? Number(searchParams.get('genre')) : null
  const urlQuery = searchParams.get('q') || ''

  const [search, setSearch] = useState(urlQuery)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loaderRef = useRef<HTMLDivElement>(null)

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
        const name = getGenreNames([id])[0]
        if (name) genreMap[id] = name
      })
    })
    return Object.entries(genreMap).sort((a, b) => a[1].localeCompare(b[1], 'fr'))
  }, [content])

  const cover = useMemo(() => (
    [...content].find(i => i.backdrop_path)
    || [...content].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0]
  ), [content])

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
      { rootMargin: '280px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const openItem = (item: Movie | Series) => openDrawer(type, item.tmdb_id || item.id)

  return (
    <div className="pb-20">
      <div className="relative h-[280px] md:h-[320px] overflow-hidden">
        {cover?.backdrop_path && (
          <Image
            src={getBackdropUrl(cover.backdrop_path)}
            alt=""
            fill
            priority
            className="object-cover object-top opacity-40"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/55 to-black/50" />
        <div className="relative h-full max-w-[1400px] mx-auto px-5 md:px-8 flex flex-col justify-end pb-8 pt-24">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="flex items-center gap-3 mb-5 -mt-2">
          <div className="flex-1 flex items-center gap-3 h-11 px-4 rounded-xl border border-white/10 bg-white/[0.04]">
            <Search className="w-4 h-4 text-white/30 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/25"
            />
            {search && (
              <button onClick={() => { setSearch(''); setParams({ q: null }) }}>
                <X className="w-4 h-4 text-white/30 hover:text-white" />
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={e => setParams({ sort: e.target.value === 'popular' ? null : e.target.value })}
            className="h-11 px-3 rounded-xl border border-white/10 bg-[#121214] text-white text-sm outline-none"
          >
            <option value="popular">Populaires</option>
            <option value="rating">Notes</option>
            <option value="newest">Récents</option>
            <option value="alpha">A → Z</option>
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
          <button
            onClick={() => setParams({ genre: null })}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${!selectedGenre ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
          >
            Tous
          </button>
          {allGenres.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setParams({ genre: selectedGenre === +id ? null : id })}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
                selectedGenre === +id ? 'bg-white text-black' : 'text-white/50 hover:text-white'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-white/35 py-20">Aucun résultat</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
            {visible.map(item => {
              const t = itemTitle(item)
              return (
                <button key={item.id} className="group text-left" onClick={() => openItem(item)}>
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
                    <Image
                      src={getPosterUrl(item.poster_path)}
                      alt={t}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="14vw"
                    />
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-white text-[11px] font-medium line-clamp-2">{t}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div ref={loaderRef} className="h-16" />
      </div>
    </div>
  )
}
