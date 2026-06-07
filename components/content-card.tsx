'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Star, Check, Plus, Info } from 'lucide-react'
import { getPosterUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'
import { cn } from '@/lib/utils'
import { useDrawer } from '@/components/movie-drawer'
import { useState, useRef, useCallback } from 'react'

interface ContentCardProps {
  content: Movie | Series
  type: 'movie' | 'series'
  index?: number
  showRank?: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
  logoUrl?: string | null
}

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

export function ContentCard({
  content, type, index = 0, showRank = false, isFavorite = false, onToggleFavorite,
  logoUrl,
}: ContentCardProps) {
  const title = isMovie(content) ? content.title : content.name
  const releaseDate = isMovie(content) ? content.release_date : content.first_air_date
  const year = releaseDate ? new Date(releaseDate).getFullYear() : ''
  const tmdbId = content.tmdb_id || content.id
  const rank = index + 1
  const { openDrawer } = useDrawer()
  const [hovered, setHovered] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / (rect.width / 2)   // -1 à 1
    const dy = (e.clientY - cy) / (rect.height / 2)  // -1 à 1
    setTilt({ x: -dy * 12, y: dx * 12 }) // inclinaison max 12deg
  }, [])

  const handleClick = () => {
    if (isTouchDevice) {
      if (!hovered) {
        setHovered(true)
      } else {
        openDrawer(type, tmdbId)
      }
    } else {
      if (!hovered) openDrawer(type, tmdbId)
    }
  }

  const handleBlur = () => {
    if (isTouchDevice) setHovered(false)
  }

  const overview = (content as any).overview || ''
  const shortOverview = overview.length > 80 ? overview.slice(0, 80) + '...' : overview
  const typeLabel = type === 'movie' ? 'FILM' : 'SÉRIE'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="relative group flex-shrink-0"
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={!isTouchDevice ? handleMouseMove : undefined}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); handleBlur() }}
      style={{
        transform: hovered && !isTouchDevice
          ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px)`
          : 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)',
        transition: hovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
        willChange: 'transform',
      }}
    >
      {/* Rank number */}
      {showRank && (
        <div
          className="absolute -left-3 bottom-4 z-10 leading-none pointer-events-none select-none font-black text-primary/30"
          style={{ fontSize: '8rem', lineHeight: 1, WebkitTextStroke: '2px currentColor', fontFamily: 'Arial Black, sans-serif' }}
        >
          {rank}
        </div>
      )}

      {/* Wrapper : gère le scale + border-radius SANS overflow:hidden */}
      <div
        className={cn(
          showRank ? 'w-40 md:w-52 ml-8' : 'w-44 md:w-56',
          'aspect-[2/3]',
        )}
        style={{
          borderRadius: '1rem',
          boxShadow: hovered ? '0 20px 48px rgba(0,0,0,0.7)' : '0 4px 16px rgba(0,0,0,0.4)',
          transform: hovered ? 'scale(1.03)' : 'scale(1)',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          willChange: 'transform',
        }}
      >
      {/* Inner : gère overflow + border + apparence */}
      <div
        className="relative overflow-hidden cursor-pointer bg-card w-full h-full"
        style={{
          borderRadius: '1rem',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
        onClick={handleClick}
      >
        {/* Poster */}
        <Image
          src={getPosterUrl(content.poster_path)}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 160px, 192px"
        />

        {/* Note badge — visible quand pas hover */}
        <AnimatePresence>
          {!hovered && (
            <motion.div
              key="badge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ background: 'rgba(20,16,0,0.75)', border: '1px solid rgba(255,200,0,0.25)', backdropFilter: 'blur(8px)' }}
            >
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              {content.vote_average?.toFixed(1) ?? 'N/A'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Titre + année — visible quand pas hover */}
        <AnimatePresence>
          {!hovered && (
            <motion.div
              key="title-bar"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-10"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 70%, transparent)' }}
            >
              <p className="text-white font-black text-sm leading-tight truncate uppercase tracking-wide mb-1">{title}</p>
              <p className="text-white/50 text-xs">{year}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              key="hover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col justify-end"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0.15) 100%)' }}
            >
              {/* Meta */}
              <div className="px-3 pb-3">
                {logoUrl && (
                  <div className="mb-2" style={{ height: '32px' }}>
                    <img
                      src={logoUrl}
                      alt={title}
                      className="h-full max-w-[75%] object-contain object-left"
                      style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9)) brightness(1.1)' }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold">
                  <span className="text-white/50">{year}</span>
                  <span className="text-white/25">·</span>
                  <span className="px-1.5 py-0.5 rounded text-white/70 text-[10px] font-bold tracking-wide"
                    style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    {typeLabel}
                  </span>
                  <span className="text-white/25">·</span>
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-yellow-400 font-bold">{content.vote_average?.toFixed(1)}</span>
                </div>

                {shortOverview && (
                  <p className="text-white/65 text-[11px] leading-relaxed mb-3 line-clamp-2">{shortOverview}</p>
                )}

                {/* Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openDrawer(type, tmdbId) }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-black text-xs tracking-widest uppercase"
                    style={{ background: '#fff' }}
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    Lecture
                  </button>

                  {onToggleFavorite && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isFavorite ? 'rgba(220,38,38,0.85)' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      {isFavorite
                        ? <Check className="w-4 h-4 text-white" />
                        : <Plus className="w-4 h-4 text-white" />
                      }
                    </button>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); openDrawer(type, tmdbId) }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    <Info className="w-4 h-4 text-white/70" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </motion.div>
  )
}
