'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Play, ChevronDown, Lock } from 'lucide-react'
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
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
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

  useEffect(() => {
    if (!seasonOpen) return
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setSeasonOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [seasonOpen])

  const playEpisode = (ep: TMDBEpisode) => {
    const from = encodeURIComponent(window.location.pathname + window.location.search)
    if (isDrawer && onClose) onClose()
    router.push(`/watch/series/${tmdbId}?season=${ep.season_number}&episode=${ep.episode_number}&play=1${isDrawer ? `&from=${from}` : ''}`)
  }

  const isCurrentEp = (ep: TMDBEpisode) =>
    ep.season_number === currentSeason && ep.episode_number === currentEpisode

  const isFuture = (ep: TMDBEpisode) =>
    !!(ep.air_date && new Date(ep.air_date) > new Date())

  return (
    <div className="w-full">
      <div className="relative mb-5">
        <button
          type="button"
          onClick={() => setSeasonOpen(v => !v)}
          className="h-10 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-zinc-200 font-semibold text-sm inline-flex items-center gap-2"
        >
          Saison {currentSeason}
          <span className="text-zinc-500 font-medium text-xs">{episodes.length} ép.</span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${seasonOpen ? 'rotate-180' : ''}`} />
        </button>

        {seasonOpen && (
          <>
            <button type="button" className="fixed inset-0 z-40" aria-label="Fermer" onClick={() => setSeasonOpen(false)} />
            <div className="absolute top-full left-0 mt-2 z-50 w-56 max-h-72 overflow-y-auto rounded-2xl bg-[#0a0a0e] border border-white/10 p-1.5 shadow-2xl">
              {Array.from({ length: totalSeasons }, (_, i) => i + 1).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { onSeasonChange(s); setSeasonOpen(false) }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    s === currentSeason ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Saison {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        {episodes.map(ep => {
          const isCurrent = isCurrentEp(ep)
          const future = isFuture(ep)
          const still = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null
          const runtime = formatRuntime(ep.runtime)

          return (
            <button
              key={ep.id}
              type="button"
              disabled={future}
              onClick={() => playEpisode(ep)}
              className={`w-full flex items-center gap-3 p-2 sm:p-2.5 rounded-2xl text-left transition-colors ${
                isCurrent
                  ? 'bg-white/[0.08] border border-white/15'
                  : future
                    ? 'bg-white/[0.01] border border-white/[0.04] opacity-50 cursor-not-allowed'
                    : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/12'
              }`}
            >
              <div className="relative w-28 sm:w-44 aspect-video rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                {still ? (
                  <Image src={still} alt="" fill className="object-cover" sizes="176px" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white/20" />
                  </span>
                )}
                {!future && (
                  <span className="absolute inset-0 bg-black/0 hover:bg-black/35 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-black fill-black ml-px" />
                    </span>
                  </span>
                )}
                {future && (
                  <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white/50" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-zinc-500 mb-0.5">
                  E{String(ep.episode_number).padStart(2, '0')}
                  {isCurrent ? <span className="text-red-400 ml-2 font-semibold">En cours</span> : null}
                </p>
                <p className="text-sm font-semibold text-white truncate">{ep.name}</p>
                {runtime && <p className="text-[11px] text-zinc-500 mt-0.5">{runtime}</p>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
