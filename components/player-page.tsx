'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Heart, Plus, Check, Star, Clock, Calendar,
  ThumbsUp, ThumbsDown, Users, Share2, Loader2,
  Film, Tv, User, ChevronDown, ChevronUp
} from 'lucide-react'
import useSWR from 'swr'
import {
  getTMDBPosterUrl, getTMDBBackdropUrl, getTMDBProfileUrl,
  formatRuntime, formatYear, getDirectors,
  type TMDBCredits, type TMDBMovieDetails, type TMDBSeriesDetails, type TMDBEpisode
} from '@/lib/tmdb'
import { EpisodeList } from '@/components/episode-list'
import { Navbar } from '@/components/navbar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface PlayerPageProps {
  type: 'movie' | 'series'
  tmdbId: number
  initialSeason?: number
  initialEpisode?: number
  playerUrl: string
  userId?: string | null
}

type TabType = 'synopsis' | 'casting' | 'similaires'

export function PlayerPage({ type, tmdbId, initialSeason = 1, initialEpisode = 1, playerUrl, userId }: PlayerPageProps) {
  const router = useRouter()
  const [tab, setTab] = useState<TabType>('synopsis')
  const [currentSeason, setCurrentSeason] = useState(initialSeason)
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode)
  const [isFavorite, setIsFavorite] = useState(false)
  const [togglingFav, setTogglingFav] = useState(false)
  const [showFullSynopsis, setShowFullSynopsis] = useState(false)

  const { data, isLoading } = useSWR(
    `/api/content/${type}/${tmdbId}${type === 'series' ? `?season=${currentSeason}` : ''}`,
    fetcher
  )

  const details = data?.details as TMDBMovieDetails | TMDBSeriesDetails | undefined
  const credits = data?.credits as TMDBCredits | undefined
  const similar = (data?.similar || []) as any[]
  const episodes = (data?.seasonData?.episodes || []) as TMDBEpisode[]

  const movieDetails = type === 'movie' ? details as TMDBMovieDetails : null
  const seriesDetails = type === 'series' ? details as TMDBSeriesDetails : null

  const title = movieDetails?.title || seriesDetails?.name || ''
  const overview = details?.overview || ''
  const posterPath = details?.poster_path || null
  const backdropPath = details?.backdrop_path || null
  const voteAverage = details?.vote_average || 0
  const releaseDate = movieDetails?.release_date || seriesDetails?.first_air_date || ''
  const genres = details?.genres || []
  const runtime = movieDetails?.runtime
  const totalSeasons = seriesDetails?.number_of_seasons || 1
  const cast = credits?.cast?.slice(0, 12) || []
  const directors = getDirectors(credits || null)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/favorites?user_id=${userId}`)
      .then(r => r.json())
      .then((favs: any[]) => {
        if (Array.isArray(favs)) setIsFavorite(favs.some(f => f.tmdb_id === tmdbId && f.content_type === type))
      }).catch(() => {})
  }, [userId, tmdbId, type])

  const toggleFavorite = async () => {
    if (!userId) { alert('Connectez-vous pour ajouter aux favoris'); return }
    setTogglingFav(true)
    try {
      if (isFavorite) {
        await fetch(`/api/favorites?tmdb_id=${tmdbId}&content_type=${type}&user_id=${userId}`, { method: 'DELETE' })
        setIsFavorite(false)
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, tmdb_id: tmdbId, content_type: type, title, poster: posterPath }),
        })
        setIsFavorite(true)
      }
    } catch (e) { console.error(e) }
    setTogglingFav(false)
  }

  if (isLoading || !details) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  const synopsisShort = overview.length > 200 ? overview.slice(0, 200) + '...' : overview

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: '560px' }}>
        {/* Backdrop */}
        {backdropPath && (
          <div className="absolute inset-0">
            <Image
              src={`https://image.tmdb.org/t/p/original${backdropPath}`}
              alt={title} fill className="object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
          </div>
        )}

        {/* Navbar */}
        <div className="relative z-10">
          <Navbar />
        </div>

        {/* Back button */}
        <div className="relative container mx-auto px-6 pt-8 mt-16">
          <Link href="/">
            <button className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 hover:border-white/30 text-white/70 hover:text-white text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-white/10 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              Retour
            </button>
          </Link>
        </div>

        <div className="relative container mx-auto px-6 py-12 pt-6 flex items-center gap-10" style={{marginTop: '16px'}}>
          {/* Tilted poster */}
          <motion.div
            initial={{ opacity: 0, x: -30, rotate: -6 }}
            animate={{ opacity: 1, x: 0, rotate: -4 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="hidden md:block flex-shrink-0 relative"
            style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0))' }}
          >
            {/* Rating badge */}
            <div className="absolute -top-3 -right-3 z-10 w-12 h-12 bg-zinc-900 rounded-full border-2 border-yellow-500/30 flex flex-col items-center justify-center shadow-xl">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-yellow-400 font-bold text-xs">{voteAverage.toFixed(1)}</span>
            </div>
            <Image
              src={getTMDBPosterUrl(posterPath, 'w342')}
              alt={title}
              width={180}
              height={270}
              className="rounded-2xl"
              style={{ transform: 'rotate(-4deg)' }}
            />
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 max-w-2xl"
          >
            {/* Meta */}
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider">
                {type === 'movie' ? 'Film' : 'Série'}
              </span>
              {releaseDate && <span className="text-white/50 text-sm">{formatYear(releaseDate)}</span>}
              {runtime && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-white/50 text-sm">{formatRuntime(runtime)}</span>
                </>
              )}
              {seriesDetails && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-white/50 text-sm">{totalSeasons} saison{totalSeasons > 1 ? 's' : ''}</span>
                </>
              )}
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight tracking-tight">
              {title}
            </h1>

            {/* Synopsis preview */}
            <p className="text-white/60 text-base leading-relaxed mb-6 max-w-xl">
              {showFullSynopsis ? overview : synopsisShort}
              {overview.length > 200 && (
                <button onClick={() => setShowFullSynopsis(!showFullSynopsis)} className="text-primary ml-1 hover:underline text-sm">
                  {showFullSynopsis ? 'Moins' : 'Plus'}
                </button>
              )}
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Regarder */}
              <button
                onClick={() => router.push(`/watch/${type}/${tmdbId}?play=1${type === 'series' ? `&season=${currentSeason}&episode=${currentEpisode}` : ''}`)}
                className="flex items-center gap-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold px-6 py-3 rounded-xl transition-all duration-150 shadow-lg shadow-red-900/40"
              >
                <Play className="w-5 h-5 fill-white" />
                <span className="text-base tracking-wide">Regarder</span>
              </button>

              {/* Favoris */}
              <button
                onClick={toggleFavorite}
                disabled={togglingFav}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-semibold px-5 py-3 rounded-xl border border-white/10 transition-all duration-150"
              >
                {togglingFav
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : isFavorite
                    ? <Check className="w-5 h-5 text-green-400" />
                    : <Plus className="w-5 h-5" />
                }
                <span className="text-sm">{isFavorite ? 'Ajouté' : 'Ma liste'}</span>
              </button>

              {/* Share */}
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title, url: location.href })
                  } else {
                    navigator.clipboard?.writeText(location.href)
                  }
                }}
                className="flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white w-12 h-12 rounded-xl border border-white/10 transition-all duration-150"
                title="Partager"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Series episode list */}
      {type === 'series' && episodes.length > 0 && (
        <div className="container mx-auto px-6 py-8">
          <EpisodeList
            episodes={episodes}
            currentSeason={currentSeason}
            currentEpisode={currentEpisode}
            totalSeasons={totalSeasons}
            tmdbId={tmdbId}
            onSeasonChange={v => {
              setCurrentSeason(v)
              setCurrentEpisode(1)
              router.push(`/watch/series/${tmdbId}?season=${v}&episode=1`)
            }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="container mx-auto px-6 mt-16">
        <div className="flex items-center gap-6 border-b border-white/10 mb-8">
          {(['synopsis', 'casting', 'similaires'] as TabType[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-sm font-semibold capitalize transition-all relative ${tab === t ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'synopsis' && (
            <motion.div key="synopsis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-12">
              <p className="text-white/70 text-base leading-relaxed max-w-2xl mb-6">{overview || 'Aucune description disponible.'}</p>
              {directors.length > 0 && (
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Réalisateur</p>
                    <p className="text-white font-medium">{directors.map(d => d.name).join(', ')}</p>
                  </div>
                  {genres.length > 0 && (
                    <div>
                      <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Genres</p>
                      <p className="text-white font-medium">{genres.map((g: any) => g.name).join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'casting' && (
            <motion.div key="casting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-12">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {cast.map((actor: any) => (
                  <div key={actor.id} className="text-center group">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-white/5">
                      <Image src={getTMDBProfileUrl(actor.profile_path)} alt={actor.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <p className="text-white text-xs font-semibold truncate">{actor.name}</p>
                    <p className="text-white/40 text-xs truncate">{actor.character}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'similaires' && (
            <motion.div key="similaires" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-12">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {similar.map((item: any) => {
                  const t = item.title || item.name
                  const d = item.release_date || item.first_air_date
                  return (
                    <Link key={item.id} href={`/watch/${type}/${item.id}`}>
                      <div className="cursor-pointer group">
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-white/5">
                          <Image src={getTMDBPosterUrl(item.poster_path)} alt={t} fill className="object-cover group-hover:opacity-80 group-hover:scale-105 transition-all duration-300" />
                        </div>
                        <p className="text-white text-xs font-semibold truncate">{t}</p>
                        <p className="text-white/40 text-xs">{formatYear(d)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
