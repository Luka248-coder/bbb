'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Star, Check, Plus, Info } from 'lucide-react'
import { getPosterUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'
import { cn } from '@/lib/utils'
import { useDrawer } from '@/components/movie-drawer'
import { useState, useRef, useCallback, useEffect } from 'react'

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
  const [glare, setGlare] = useState({ x: 50, y: 50 })
  const cardRef = useRef<HTMLDivElement>(null)
  const touchTimerRef = useRef<NodeJS.Timeout>()

  const [isTouchDevice, setIsTouchDevice] = useState(false)
  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none)').matches)
  }, [])

  // ── Mouse tilt (desktop) ─────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / (rect.width / 2)
    const dy = (e.clientY - cy) / (rect.height / 2)
    setTilt({ x: -dy * 12, y: dx * 12 })
    setGlare({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }, [])

  // ── Gyroscope mobile — tilt permanent ────────────────────────────────────
  useEffect(() => {
    if (!isTouchDevice) return

    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try { await (DeviceOrientationEvent as any).requestPermission() } catch {}
      }
    }
    requestPermission()

    const handler = (e: DeviceOrientationEvent) => {
      const x = Math.max(-12, Math.min(12, (e.beta ?? 0) - 30))
      const y = Math.max(-12, Math.min(12, e.gamma ?? 0))
      setTilt({ x: x * 0.5, y: y * 0.5 })
      // Glare suit l'inclinaison
      setGlare({ x: 50 + y * 3, y: 50 + x * 3 })
    }
    window.addEventListener('deviceorientation', handler, true)
    return () => window.removeEventListener('deviceorientation', handler, true)
  }, [isTouchDevice])

  // ── Touch : press = agrandir + hover overlay, tap rapide = drawer ─────────
  const handleTouchStart = useCallback(() => {
    touchTimerRef.current = setTimeout(() => {
      setHovered(true)
    }, 120) // agrandit après 120ms de contact
  }, [])

  const handleTouchEnd = useCallback(() => {
    clearTimeout(touchTimerRef.current)
    if (!hovered) {
      openDrawer(type, tmdbId)
    } else {
      setHovered(false)
    }
  }, [hovered, openDrawer, type, tmdbId])

  // Fermer si on scroll
  const handleTouchMove = useCallback(() => {
    clearTimeout(touchTimerRef.current)
  }, [])

  const handleClick = () => {
    if (!isTouchDevice) openDrawer(type, tmdbId)
  }

  const overview = (content as any).overview || ''
  const shortOverview = overview.length > 80 ? overview.slice(0, 80) + '...' : overview
  const typeLabel = type === 'movie' ? 'FILM' : 'SÉRIE'

  // Sur mobile le tilt est permanent, la brillance aussi quand hovered
  const activeTilt = isTouchDevice
    ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
    : hovered
      ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px)`
      : 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)'

  const activeScale = hovered ? (isTouchDevice ? 1.08 : 1.03) : 1
  const activeShadow = hovered
    ? isTouchDevice
      ? '0 28px 60px rgba(0,0,0,0.85), 0 0 40px rgba(255,200,100,0.15)'
      : '0 20px 48px rgba(0,0,0,0.7)'
    : '0 4px 16px rgba(0,0,0,0.4)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="relative group flex-shrink-0"
      style={{ zIndex: hovered ? 20 : 1 }}
    >
      <div
        ref={cardRef}
        onMouseEnter={() => !isTouchDevice && setHovered(true)}
        onMouseMove={!isTouchDevice ? handleMouseMove : undefined}
        onMouseLeave={() => { if (!isTouchDevice) { setHovered(false); setTilt({ x: 0, y: 0 }) } }}
        onTouchStart={isTouchDevice ? handleTouchStart : undefined}
        onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
        onTouchMove={isTouchDevice ? handleTouchMove : undefined}
        style={{
          transform: activeTilt,
          transition: isTouchDevice
            ? 'transform 0.15s ease-out'
            : hovered ? 'transform 0.08s ease-out' : 'transform 0.4s ease-out',
          willChange: 'transform',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Rank */}
        {showRank && (
          <div
            className="absolute -left-3 bottom-4 z-10 leading-none pointer-events-none select-none font-black text-primary/30"
            style={{ fontSize: '8rem', lineHeight: 1, WebkitTextStroke: '2px currentColor', fontFamily: 'Arial Black, sans-serif' }}
          >
            {rank}
          </div>
        )}

        {/* Card wrapper */}
        <div
          className={cn(showRank ? 'w-40 md:w-52 ml-8' : 'w-44 md:w-56', 'aspect-[2/3]')}
          style={{
            borderRadius: '1rem',
            boxShadow: activeShadow,
            transform: `scale(${activeScale})`,
            transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease',
            willChange: 'transform',
          }}
        >
          <div
            className="relative overflow-hidden cursor-pointer bg-card w-full h-full"
            style={{
              borderRadius: '1rem',
              border: hovered && isTouchDevice
                ? '1px solid rgba(255,200,100,0.35)'
                : '1px solid rgba(255,255,255,0.07)',
              transition: 'border 0.2s ease',
            }}
            onClick={handleClick}
          >
            {/* Brillance gyroscope — toujours active sur mobile */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,220,120,${isTouchDevice ? (hovered ? 0.28 : 0.12) : (hovered ? 0.18 : 0)}) 0%, rgba(255,255,255,${isTouchDevice ? (hovered ? 0.12 : 0.04) : 0}) 40%, transparent 70%)`,
                mixBlendMode: 'overlay',
                transition: 'background 0.1s ease',
              }}
            />

            {/* Reflet arc-en-ciel sur mobile au hover */}
            {isTouchDevice && hovered && (
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  background: `linear-gradient(${135 + tilt.y * 3}deg, rgba(255,0,128,0.08) 0%, rgba(255,200,0,0.1) 25%, rgba(0,255,200,0.08) 50%, rgba(100,0,255,0.08) 75%, rgba(255,0,128,0.06) 100%)`,
                  mixBlendMode: 'color-dodge',
                  opacity: 0.7,
                }}
              />
            )}

            {/* Poster */}
            <Image
              src={getPosterUrl(content.poster_path)}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 160px, 192px"
            />

            {/* Note badge */}
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

            {/* Titre + année */}
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
                          {isFavorite ? <Check className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
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
      </div>
    </motion.div>
  )
}
