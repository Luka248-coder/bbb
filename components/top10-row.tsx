'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'
import { getBackdropUrl, getPosterUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'
import { useDrawer } from '@/components/movie-drawer'

function isMovie(item: Movie | Series): item is Movie { return 'title' in item }

interface Top10RowProps {
  title: string
  content: (Movie | Series)[]
  type: 'movie' | 'series'
  accentColor?: string
}

export function Top10Row({ title, content, type, accentColor = '#e53935' }: Top10RowProps) {
  const { openDrawer } = useDrawer()
  const scrollRef = useRef<HTMLDivElement>(null)
  const items = content.slice(0, 10)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'left' ? -600 : 600, behavior: 'smooth' })
  }

  if (items.length === 0) return null

  return (
    <section className="relative py-6">
      <div className="px-6 md:px-16 mb-5 flex items-center gap-3">
        <div className="w-[3px] rounded-full self-stretch" style={{ background: `linear-gradient(to bottom, ${accentColor}, transparent)`, minHeight: '2rem' }} />
        <h2 className="text-2xl md:text-3xl font-black text-white">{title}</h2>
      </div>

      <div className="relative group">
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        <div
          ref={scrollRef}
          className="flex"
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            flexWrap: 'nowrap',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingLeft: 'max(1.5rem, calc((100% - 80rem) / 2 + 1.5rem))',
            paddingRight: '1.5rem',
          }}
        >
          {items.map((item, i) => {
            const t = isMovie(item) ? item.title : item.name
            const tmdbId = (item as any).tmdb_id || item.id
            const genres = getGenreNames(item.genre_ids || []).slice(0, 1)
            return (
              <Top10Card
                key={item.id}
                item={item}
                rank={i + 1}
                title={t}
                tmdbId={tmdbId}
                type={type}
                genres={genres}
                accentColor={accentColor}
                index={i}
                onOpen={() => openDrawer(type as 'movie' | 'series', tmdbId)}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Top10Card({
  item, rank, title, genres, accentColor, index, onOpen
}: {
  item: Movie | Series
  rank: number
  title: string
  tmdbId: number
  type: string
  genres: string[]
  accentColor: string
  index: number
  onOpen: () => void
}) {
  const [hovered, setHovered] = useState(false)

  const imgSrc = (item as any).backdrop_path
    ? getBackdropUrl((item as any).backdrop_path)
    : getPosterUrl(item.poster_path)

  const numColor = rank <= 3 ? accentColor : '#ffffff'
  const numShadow = rank <= 3
    ? `0 0 40px ${accentColor}80, 3px 5px 0 rgba(0,0,0,0.95)`
    : `3px 5px 0 rgba(0,0,0,0.95)`

  /* Chaque item = chiffre à gauche + carte à droite, dans un flex row */
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-shrink-0 flex items-center cursor-pointer"
      style={{ gap: '0' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      {/* Chiffre à gauche, complètement en dehors de la carte */}
      <div
        className="flex-shrink-0 font-black leading-none select-none pointer-events-none text-center"
        style={{
          fontSize: '8rem',
          lineHeight: 1,
          fontFamily: 'Arial Black, Impact, sans-serif',
          color: numColor,
          textShadow: numShadow,
          WebkitTextStroke: rank <= 3 ? '0px' : '2px rgba(120,120,120,0.5)',
          width: rank < 10 ? '3.5rem' : '5rem',
          transition: 'transform 0.3s',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        {rank}
      </div>

      {/* Carte image */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          width: 260,
          borderRadius: '14px',
          aspectRatio: '16/9',
          boxShadow: hovered
            ? `0 20px 50px rgba(0,0,0,0.8), 0 0 0 2px ${accentColor}`
            : '0 8px 24px rgba(0,0,0,0.6)',
          transform: hovered ? 'scale(1.03) translateY(-4px)' : 'scale(1)',
          transition: 'transform 0.3s, box-shadow 0.3s',
        }}
      >
        <Image
          src={imgSrc}
          alt={title}
          fill
          className="object-cover"
          style={{ transform: hovered ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.5s' }}
        />

        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 45%, transparent 100%)'
        }} />

        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.5)', backdropFilter: 'blur(4px)' }}>
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-6">
          <p className="text-white font-black text-[13px] uppercase tracking-wide truncate leading-tight mb-1">{title}</p>
          <div className="flex items-center gap-1.5 text-[11px]">
            {item.vote_average && (
              <span className="text-yellow-400 font-bold flex items-center gap-0.5">★ {item.vote_average.toFixed(1)}</span>
            )}
            {genres[0] && (
              <><span className="text-white/30">·</span><span className="text-white/50 uppercase tracking-wider font-medium">{genres[0]}</span></>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
