'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Star, Trophy, Clapperboard, Tv } from 'lucide-react'
import { getBackdropUrl, getPosterUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'
import { useDrawer } from '@/components/movie-drawer'

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

function itemTitle(item: Movie | Series) {
  return isMovie(item) ? (item.title || item.original_title) : (item.name || item.original_name)
}

function itemYear(item: Movie | Series) {
  const d = isMovie(item) ? item.release_date : item.first_air_date
  if (!d) return ''
  const y = new Date(d).getFullYear()
  return Number.isFinite(y) ? String(y) : ''
}

function metal(rank: number) {
  if (rank === 1) return { ring: '#f5c518', glow: 'rgba(245,197,24,0.35)', wash: 'rgba(245,197,24,0.16)', label: '1er' }
  if (rank === 2) return { ring: '#d9e2ec', glow: 'rgba(217,226,236,0.28)', wash: 'rgba(217,226,236,0.10)', label: '2e' }
  if (rank === 3) return { ring: '#d4924a', glow: 'rgba(212,146,74,0.32)', wash: 'rgba(212,146,74,0.14)', label: '3e' }
  return { ring: 'rgba(255,255,255,0.16)', glow: 'transparent', wash: 'transparent', label: `${rank}` }
}

interface Top10RowProps {
  title: string
  content: (Movie | Series)[]
  type: 'movie' | 'series'
  accentColor?: string
}

export function Top10Row({ title: _title, content, type }: Top10RowProps) {
  const { openDrawer } = useDrawer()
  const railRef = useRef<HTMLDivElement>(null)
  const items = content.slice(0, 10)
  const isFilms = type === 'movie'
  const [first, second, third, ...rest] = items

  const scroll = (dir: 'left' | 'right') => {
    railRef.current?.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' })
  }

  if (items.length === 0) return null

  return (
    <section className="relative py-10 md:py-14 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isFilms
            ? 'radial-gradient(ellipse 80% 60% at 8% 40%, rgba(245,197,24,0.08), transparent 55%), radial-gradient(ellipse 50% 50% at 90% 80%, rgba(220,38,38,0.07), transparent 50%)'
            : 'radial-gradient(ellipse 80% 60% at 8% 40%, rgba(220,38,38,0.10), transparent 55%), radial-gradient(ellipse 50% 50% at 90% 80%, rgba(99,102,241,0.08), transparent 50%)',
        }}
      />

      <div className="relative px-4 md:px-8 mb-7 md:mb-9 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-extrabold tracking-[0.22em] uppercase text-amber-400/90">
              Classement de la semaine
            </span>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2
              className="text-4xl md:text-6xl font-black text-white leading-none tracking-tight"
              style={{ fontFamily: 'var(--font-barlow-condensed), Barlow Condensed, Impact, sans-serif' }}
            >
              TOP 10
            </h2>
            <span className="inline-flex items-center gap-1.5 text-white/45 text-sm md:text-base font-semibold pb-1">
              {isFilms ? <Clapperboard className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
              {isFilms ? 'Films' : 'Séries'}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop podium */}
      <div className="hidden lg:grid grid-cols-12 gap-4 px-8 mb-4">
        {first && (
          <HeroRank
            item={first}
            rank={1}
            type={type}
            onOpen={() => openDrawer(type, first.tmdb_id || first.id)}
            className="col-span-6 min-h-[380px]"
          />
        )}
        {second && (
          <PodiumPoster
            item={second}
            rank={2}
            type={type}
            onOpen={() => openDrawer(type, second.tmdb_id || second.id)}
            className="col-span-3 min-h-[380px]"
          />
        )}
        {third && (
          <PodiumPoster
            item={third}
            rank={3}
            type={type}
            onOpen={() => openDrawer(type, third.tmdb_id || third.id)}
            className="col-span-3 min-h-[380px]"
          />
        )}
      </div>

      <div className="hidden lg:grid grid-cols-7 gap-3 px-8">
        {rest.map((item, i) => (
          <CompactRank
            key={item.tmdb_id || item.id}
            item={item}
            rank={i + 4}
            type={type}
            onOpen={() => openDrawer(type, item.tmdb_id || item.id)}
          />
        ))}
      </div>

      {/* Mobile / tablet rail */}
      <div className="relative lg:hidden group">
        <button
          type="button"
          aria-label="Précédent"
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full hidden sm:flex items-center justify-center bg-black/55 border border-white/15 text-white backdrop-blur-md"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Suivant"
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full hidden sm:flex items-center justify-center bg-black/55 border border-white/15 text-white backdrop-blur-md"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-2"
          style={{ paddingLeft: '1rem', paddingRight: '1.5rem' }}
        >
          {items.map((item, i) => (
            <div key={item.tmdb_id || item.id} className="snap-start shrink-0 w-[72vw] max-w-[280px]">
              {i === 0 ? (
                <HeroRank
                  item={item}
                  rank={1}
                  type={type}
                  onOpen={() => openDrawer(type, item.tmdb_id || item.id)}
                  className="h-[360px]"
                />
              ) : (
                <PodiumPoster
                  item={item}
                  rank={i + 1}
                  type={type}
                  onOpen={() => openDrawer(type, item.tmdb_id || item.id)}
                  className="h-[360px]"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const m = metal(rank)
  return (
    <div
      className="absolute top-3 left-3 z-20 min-w-[2.35rem] h-9 px-2 rounded-lg flex items-center justify-center font-black text-sm tracking-tight"
      style={{
        background: 'rgba(0,0,0,0.72)',
        border: `1px solid ${m.ring}`,
        boxShadow: `0 0 18px ${m.glow}`,
        color: rank <= 3 ? m.ring : '#fff',
        fontFamily: 'var(--font-barlow-condensed), Barlow Condensed, sans-serif',
      }}
    >
      {rank === 10 ? '10' : `0${rank}`}
    </div>
  )
}

function HeroRank({
  item, rank, type, onOpen, className = '',
}: {
  item: Movie | Series
  rank: number
  type: 'movie' | 'series'
  onOpen: () => void
  className?: string
}) {
  const title = itemTitle(item)
  const year = itemYear(item)
  const genres = getGenreNames(item.genre_ids || []).slice(0, 2)
  const m = metal(rank)
  const backdrop = item.backdrop_path ? getBackdropUrl(item.backdrop_path) : getPosterUrl(item.poster_path)

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group relative overflow-hidden rounded-3xl text-left w-full ${className}`}
      style={{
        border: `1px solid ${m.ring}55`,
        boxShadow: `0 24px 60px rgba(0,0,0,0.45), 0 0 40px ${m.glow}`,
      }}
    >
      <Image src={backdrop} alt="" fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 80vw, 50vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

      <span
        className="absolute -left-2 -bottom-8 select-none pointer-events-none font-black leading-none"
        style={{
          fontFamily: 'var(--font-barlow-condensed), Barlow Condensed, Impact, sans-serif',
          fontSize: '12rem',
          color: 'transparent',
          WebkitTextStroke: `3px ${m.ring}`,
          opacity: 0.35,
        }}
      >
        01
      </span>

      <RankBadge rank={rank} />

      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7 z-10">
        <p className="text-amber-300 text-[10px] font-extrabold tracking-[0.2em] uppercase mb-2">N°1 de la semaine</p>
        <h3 className="text-white text-2xl md:text-3xl font-black leading-tight mb-3 drop-shadow-lg line-clamp-2">{title}</h3>
        <div className="flex items-center gap-2 text-sm text-white/70 mb-4 flex-wrap">
          {item.vote_average > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              {item.vote_average.toFixed(1)}
            </span>
          )}
          {year && <span>· {year}</span>}
          {genres.map(g => (
            <span key={g} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 border border-white/10">{g}</span>
          ))}
        </div>
        <span className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white text-black text-xs font-black tracking-widest uppercase group-hover:scale-[1.03] transition-transform">
          <Play className="w-3.5 h-3.5 fill-black" />
          Voir la fiche
        </span>
      </div>
    </motion.button>
  )
}

function PodiumPoster({
  item, rank, onOpen, className = '',
}: {
  item: Movie | Series
  rank: number
  type: 'movie' | 'series'
  onOpen: () => void
  className?: string
}) {
  const title = itemTitle(item)
  const year = itemYear(item)
  const m = metal(rank)

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: rank * 0.04 }}
      className={`group relative overflow-hidden rounded-3xl text-left w-full ${className}`}
      style={{
        border: `1px solid ${m.ring}40`,
        boxShadow: rank <= 3 ? `0 18px 40px rgba(0,0,0,0.4), 0 0 24px ${m.glow}` : '0 12px 28px rgba(0,0,0,0.35)',
      }}
    >
      <Image
        src={getPosterUrl(item.poster_path)}
        alt={title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="280px"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
      <RankBadge rank={rank} />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 border border-white/40 backdrop-blur-md">
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <p className="text-white font-bold text-sm leading-snug line-clamp-2 mb-1">{title}</p>
        <div className="flex items-center gap-2 text-[11px] text-white/55">
          {item.vote_average > 0 && (
            <span className="text-amber-400 font-bold">★ {item.vote_average.toFixed(1)}</span>
          )}
          {year && <span>{year}</span>}
        </div>
      </div>
    </motion.button>
  )
}

function CompactRank({
  item, rank, onOpen,
}: {
  item: Movie | Series
  rank: number
  type: 'movie' | 'series'
  onOpen: () => void
}) {
  const title = itemTitle(item)

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: rank * 0.03 }}
      className="group text-left"
    >
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 ring-1 ring-white/10 group-hover:ring-white/30 transition-all group-hover:-translate-y-1 group-hover:shadow-2xl">
        <Image
          src={getPosterUrl(item.poster_path)}
          alt={title}
          fill
          className="object-cover group-hover:scale-[1.05] transition-transform duration-500"
          sizes="160px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <span
          className="absolute bottom-1.5 left-2 font-black text-white/90 leading-none"
          style={{
            fontFamily: 'var(--font-barlow-condensed), Barlow Condensed, sans-serif',
            fontSize: '2rem',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
          }}
        >
          {rank}
        </span>
      </div>
      <p className="mt-2 text-white/85 text-xs font-semibold leading-snug line-clamp-2 group-hover:text-white">{title}</p>
    </motion.button>
  )
}
