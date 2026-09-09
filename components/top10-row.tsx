'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPosterUrl, type Movie, type Series } from '@/lib/content-types'
import { useDrawer } from '@/components/movie-drawer'

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

function itemTitle(item: Movie | Series) {
  return isMovie(item) ? (item.title || item.original_title) : (item.name || item.original_name)
}

interface Top10RowProps {
  title: string
  content: (Movie | Series)[]
  type: 'movie' | 'series'
  accentColor?: string
}

export function Top10Row({ content, type }: Top10RowProps) {
  const { openDrawer } = useDrawer()
  const scrollRef = useRef<HTMLDivElement>(null)
  const items = content.slice(0, 10)
  const isFilms = type === 'movie'

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -420 : 420, behavior: 'smooth' })
  }

  if (items.length === 0) return null

  return (
    <section className="relative py-5">
      <div className="px-4 md:px-8 mb-3 flex items-center gap-2">
        <span className="w-[3px] h-4 rounded-sm bg-red-600" />
        <h2 className="text-base md:text-lg font-bold text-white tracking-wide">
          Top 10 {isFilms ? 'Films' : 'Séries'}
        </h2>
        <span className="text-white/30 text-xs font-semibold uppercase tracking-wider">cette semaine</span>
      </div>

      <div className="relative group">
        <button
          type="button"
          aria-label="Précédent"
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full hidden md:flex items-center justify-center bg-black/70 border border-white/15 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Suivant"
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full hidden md:flex items-center justify-center bg-black/70 border border-white/15 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto hide-scrollbar"
          style={{ paddingLeft: '1rem', paddingRight: '1.5rem', gap: '0.35rem' }}
        >
          {items.map((item, i) => {
            const tmdbId = item.tmdb_id || item.id
            const title = itemTitle(item)
            const rank = i + 1
            return (
              <button
                key={tmdbId}
                type="button"
                onClick={() => openDrawer(type, tmdbId)}
                className="relative shrink-0 flex items-end group/card"
                style={{ width: rank === 10 ? 168 : 152 }}
              >
                <span
                  className="select-none pointer-events-none leading-none font-black shrink-0"
                  style={{
                    fontFamily: 'var(--font-barlow-condensed), Barlow Condensed, Impact, sans-serif',
                    fontSize: rank === 10 ? '4.4rem' : '5rem',
                    color: 'transparent',
                    WebkitTextStroke: rank <= 3 ? '2px #dc2626' : '2px rgba(255,255,255,0.28)',
                    marginRight: -14,
                    marginBottom: -6,
                  }}
                >
                  {rank}
                </span>
                <div className="relative w-[108px] aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 ring-1 ring-white/10 group-hover/card:ring-red-500/70 transition-all group-hover/card:-translate-y-0.5">
                  <Image
                    src={getPosterUrl(item.poster_path)}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="108px"
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
