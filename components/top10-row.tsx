'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'
import { getBackdropUrl, getPosterUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'
import { useDrawer } from '@/components/movie-drawer'
import Link from 'next/link'

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
    scrollRef.current.scrollBy({ left: dir === 'left' ? -500 : 500, behavior: 'smooth' })
  }

  if (items.length === 0) return null

  return (
    <section className="relative py-6">
      {/* Header */}
      <div className="px-6 md:px-16 mb-5 flex items-center gap-3">
        <div className="w-[3px] rounded-full self-stretch" style={{ background: `linear-gradient(to bottom, ${accentColor}, transparent)`, minHeight: '2rem' }} />
        <h2 className="text-2xl md:text-3xl font-black text-white">{title}</h2>
      </div>

      {/* Scroll container */}
      <div className="relative group">
        {/* Boutons nav */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto hide-scrollbar gap-0"
          style={{ paddingLeft: 'max(1.5rem, calc((100% - 80rem) / 2 + 1.5rem))', paddingRight: '1.5rem' }}
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
  item, rank, title, tmdbId, type, genres, accentColor, index, onOpen
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative flex-shrink-0 cursor-pointer"
      style={{
        width: 320,
        marginLeft: index === 0 ? 0 : '-2rem', // léger chevauchement
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      {/* Numéro géant à gauche */}
      <div
        className="absolute left-0 bottom-0 z-20 font-black leading-none select-none pointer-events-none"
        style={{
          fontSize: '9rem',
          lineHeight: 1,
          fontFamily: 'Arial Black, Impact, sans-serif',
          color: accentColor,
          WebkitTextStroke: '0px',
          textShadow: `0 0 40px ${accentColor}60, 2px 4px 0 rgba(0,0,0,0.9)`,
          bottom: '-0.15em',
          left: '-0.05em',
          transition: 'all 0.3s',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        {rank}
      </div>

      {/* Carte image */}
      <div
        className="relative overflow-hidden transition-all duration-300"
        style={{
          marginLeft: rank < 10 ? '3.5rem' : '5rem',
          borderRadius: '14px',
          aspectRatio: '16/9',
          boxShadow: hovered
            ? `0 20px 50px rgba(0,0,0,0.8), 0 0 0 2px ${accentColor}`
            : '0 8px 24px rgba(0,0,0,0.6)',
          transform: hovered ? 'scale(1.03) translateY(-4px)' : 'scale(1)',
        }}
      >
        <Image
          src={imgSrc}
          alt={title}
          fill
          className="object-cover transition-transform duration-500"
          style={{ transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
        />

        {/* Dégradé bas */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 45%, transparent 100%)'
        }} />

        {/* Bouton play hover */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.5)', backdropFilter: 'blur(4px)' }}>
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Infos bas */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-6">
          <p className="text-white font-black text-[13px] uppercase tracking-wide truncate leading-tight mb-1">
            {title}
          </p>
          <div className="flex items-center gap-1.5 text-[11px]">
            {item.vote_average && (
              <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                ★ {item.vote_average.toFixed(1)}
              </span>
            )}
            {genres[0] && (
              <>
                <span className="text-white/30">·</span>
                <span className="text-white/50 uppercase tracking-wider font-medium">{genres[0]}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
