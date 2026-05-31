'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, ChevronDown, Clock, Star, Lock, X } from 'lucide-react'
import type { TMDBEpisode } from '@/lib/tmdb'

interface EpisodeListProps {
  episodes: TMDBEpisode[]
  currentSeason: number
  currentEpisode: number
  totalSeasons: number
  tmdbId: number
  onSeasonChange: (season: number) => void
  onClose?: () => void
  isDrawer?: boolean
}

function formatRuntime(mins: number) {
  if (!mins) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`
}

function formatDate(dateStr: string) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Composant modal pour le sélecteur de saison (scroll garanti)
function SeasonModal({
  open,
  totalSeasons,
  currentSeason,
  episodeCount,
  onSelect,
  onClose,
}: {
  open: boolean
  totalSeasons: number
  currentSeason: number
  episodeCount: number
  onSelect: (s: number) => void
  onClose: () => void
}) {
  // Fermer avec Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const content = (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full sm:w-80 bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/60 overflow-hidden"
        style={{ maxHeight: '70vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-zinc-900 z-10">
          <span className="text-white font-bold text-base">Choisir une saison</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Liste scrollable */}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(70vh - 60px)', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {Array.from({ length: totalSeasons }, (_, i) => i + 1).map(s => (
            <button
              key={s}
              onClick={() => { onSelect(s); onClose() }}
              className={`w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold transition-colors border-b border-white/5 last:border-0 ${
                s === currentSeason
                  ? 'bg-primary/20 text-primary'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>Saison {s}</span>
              <div className="flex items-center gap-3">
                {s === currentSeason && (
                  <span className="text-xs text-primary/70 font-medium">{episodeCount} ép.</span>
                )}
                {s === currentSeason && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}

export function EpisodeList({
  episodes,
  currentSeason,
  currentEpisode,
  totalSeasons,
  tmdbId,
  onSeasonChange,
  onClose,
  isDrawer = false,
}: EpisodeListProps) {
  const router = useRouter()
  const [seasonOpen, setSeasonOpen] = useState(false)
  const [hoveredEp, setHoveredEp] = useState<number | null>(null)

  const playEpisode = (ep: TMDBEpisode) => {
    const from = encodeURIComponent(window.location.pathname + window.location.search)
    if (isDrawer && onClose) onClose()
    router.push(`/watch/series/${tmdbId}?season=${ep.season_number}&episode=${ep.episode_number}&play=1${isDrawer ? `&from=${from}` : ''}`)
  }

  const selectEpisode = (ep: TMDBEpisode) => {
    const from = encodeURIComponent(window.location.pathname + window.location.search)
    if (isDrawer && onClose) onClose()
    router.push(`/watch/series/${tmdbId}?season=${ep.season_number}&episode=${ep.episode_number}${isDrawer ? `&from=${from}` : ''}`)
  }

  const isCurrentEp = (ep: TMDBEpisode) =>
    ep.season_number === currentSeason && ep.episode_number === currentEpisode

  const isFuture = (ep: TMDBEpisode) =>
    ep.air_date && new Date(ep.air_date) > new Date()

  return (
    <div className="w-full">
      {/* Season selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <button
            onClick={() => setSeasonOpen(true)}
            className="flex items-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl text-white font-bold transition-all group"
          >
            <span className="text-base">Saison {currentSeason}</span>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-0.5">
              <span className="text-xs text-white/60 font-medium">{episodes.length} épisodes</span>
            </div>
            <ChevronDown className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </div>

      {/* Season modal — rendu hors du flux normal, pas de problème overflow */}
      <AnimatePresence>
        {seasonOpen && (
          <SeasonModal
            open={seasonOpen}
            totalSeasons={totalSeasons}
            currentSeason={currentSeason}
            episodeCount={episodes.length}
            onSelect={onSeasonChange}
            onClose={() => setSeasonOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Episode list */}
      <div className="space-y-2">
        {episodes.map((ep, index) => {
          const isCurrent = isCurrentEp(ep)
          const future = isFuture(ep)
          const isHovered = hoveredEp === ep.episode_number
          const still = ep.still_path
            ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
            : null
          const runtime = formatRuntime(ep.runtime)
          const date = formatDate(ep.air_date)

          return (
            <motion.div
              key={ep.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
              onMouseEnter={() => setHoveredEp(ep.episode_number)}
              onMouseLeave={() => setHoveredEp(null)}
              onClick={() => !future && playEpisode(ep)}
              className={`group relative flex gap-0 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border ${
                isCurrent
                  ? 'border-primary/40 bg-primary/5'
                  : future
                  ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-default'
                  : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/10'
              }`}
            >
              {/* Left accent bar for current */}
              {isCurrent && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full" />
              )}

              {/* Thumbnail */}
              <div className="relative flex-shrink-0 w-[220px] aspect-video bg-white/5 overflow-hidden">
                {still ? (
                  <Image
                    src={still}
                    alt={ep.name}
                    fill
                    className={`object-cover transition-transform duration-500 ${isHovered && !future ? 'scale-105' : 'scale-100'}`}
                    sizes="220px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                    <Play className="w-8 h-8 text-white/20" />
                  </div>
                )}

                {/* Overlay — visible au hover sur desktop, toujours visible sur mobile */}
                <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200 ${isHovered && !future ? 'opacity-100' : 'opacity-0 md:opacity-0'} ${!future ? 'max-md:opacity-100' : ''}`}>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: isHovered && !future ? 1 : 0.8 }}
                    transition={{ duration: 0.15 }}
                    onClick={e => { e.stopPropagation(); if (!future) playEpisode(ep) }}
                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-transform"
                  >
                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                  </motion.div>
                </div>

                {/* Episode number badge */}
                <div className={`absolute bottom-2 left-2 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black backdrop-blur-md ${
                  isCurrent ? 'bg-primary text-white' : 'bg-black/60 text-white/80'
                }`}>
                  {String(ep.episode_number).padStart(2, '0')}
                </div>

                {/* Future lock */}
                {future && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Lock className="w-6 h-6 text-white/40" />
                  </div>
                )}

                {/* Current playing indicator */}
                {isCurrent && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-primary/90 backdrop-blur-sm rounded-lg px-2 py-1">
                    <div className="flex gap-0.5 items-end h-3">
                      {[1, 2, 3].map(b => (
                        <motion.div
                          key={b}
                          className="w-0.5 bg-white rounded-full"
                          animate={{ height: ['4px', '10px', '4px'] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: b * 0.15 }}
                        />
                      ))}
                    </div>
                    <span className="text-white text-[10px] font-bold">EN COURS</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-center px-5 py-4 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className={`font-bold leading-tight text-base ${isCurrent ? 'text-white' : 'text-white/90'}`}>
                    {ep.name}
                  </h3>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {ep.vote_average > 0 && (
                      <div className="flex items-center gap-1 opacity-60">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-white text-xs font-semibold">{ep.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                    {runtime && (
                      <div className="flex items-center gap-1 text-white/40">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{runtime}</span>
                      </div>
                    )}
                  </div>
                </div>

                {ep.overview && (
                  <p className="text-white/50 text-sm leading-relaxed line-clamp-2 mb-2">
                    {ep.overview}
                  </p>
                )}

                {date && (
                  <p className="text-white/25 text-xs">{date}</p>
                )}
              </div>

              {/* Right play arrow (on hover) */}
              {!future && (
                <div className={`flex items-center pr-4 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                  <div
                    onClick={e => { e.stopPropagation(); playEpisode(ep) }}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-primary flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
