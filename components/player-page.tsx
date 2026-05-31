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
  isDrawer?: boolean
  onClose?: () => void
}

type TabType = 'synopsis' | 'casting' | 'similaires'

export function PlayerPage({ type, tmdbId, initialSeason = 1, initialEpisode = 1, playerUrl, userId, isDrawer = false, onClose }: PlayerPageProps) {
  const router = useRouter()
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
  const collection = (data?.collection || null) as { id: number; name: string; parts: { id: number; title: string; poster_path: string | null; release_date: string; vote_average: number }[] } | null
  const logo = (data?.logo || null) as string | null
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
    <div className={isDrawer ? '' : 'min-h-screen bg-background'}>
      {/* Hero section */}
      <div
        className="relative w-full overflow-hidden"
        style={{ minHeight: isDrawer ? '460px' : '560px', borderRadius: isDrawer ? '24px 24px 0 0' : undefined }}
      >
        {/* Backdrop */}
        {backdropPath && (
          <div className="absolute inset-0">
            <Image
              src={`https://image.tmdb.org/t/p/original${backdropPath}`}
              alt={title} fill className="object-cover object-center"
            />
            {isDrawer ? (
              <>
                {/* Drawer mode: subtle left+bottom gradients only */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,12,0.98) 0%, rgba(10,10,12,0.5) 30%, transparent 60%)' }} />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
              </>
            )}
          </div>
        )}
        {!backdropPath && isDrawer && (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgb(20,10,10), rgb(10,10,12))' }} />
        )}

        {/* Navbar — masqué en mode drawer */}
        {!isDrawer && (
          <div className="relative z-10">
            <Navbar />
          </div>
        )}

        {/* Back button — masqué en mode drawer */}
        {!isDrawer && (
          <div className="relative container mx-auto px-6 pt-8 mt-16">
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                const from = params.get('from')
                if (from) router.push(decodeURIComponent(from))
                else router.back()
              }}
              className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 hover:border-white/30 text-white/70 hover:text-white text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-white/10 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              Retour
            </button>
          </div>
        )}

        {isDrawer ? (
          /* ── DRAWER HERO: infos en bas du backdrop, plein cadre ── */
          <div className="absolute bottom-0 left-0 right-0 pl-16 pr-8 pb-8 pt-20 z-10">
            {/* Meta row */}
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider">
                {type === 'movie' ? 'Film' : 'Série'}
              </span>
              {releaseDate && <span className="text-white/60 text-sm">{formatYear(releaseDate)}</span>}
              {runtime && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-white/60 text-sm">{formatRuntime(runtime)}</span>
                </>
              )}
              {seriesDetails && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-white/60 text-sm">{totalSeasons} saison{totalSeasons > 1 ? 's' : ''}</span>
                </>
              )}
            </div>

            {/* Title or Logo */}
            {logo ? (
              <Image src={logo} alt={title} width={340} height={140}
                className="object-contain object-left max-h-[120px] w-auto mb-4 drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.8))' }}
              />
            ) : (
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight drop-shadow-2xl">
                {title}
              </h1>
            )}

            {/* Synopsis */}
            <p className="text-white/70 text-sm leading-relaxed mb-5 max-w-xl">
              {showFullSynopsis ? overview : synopsisShort}
              {overview.length > 200 && (
                <button onClick={() => setShowFullSynopsis(!showFullSynopsis)} className="text-primary ml-1 hover:underline text-sm">
                  {showFullSynopsis ? 'Moins' : 'Plus'}
                </button>
              )}
            </p>

            {/* Genres + Buttons row */}
            <div className="flex items-center justify-between gap-4">
              {/* Genres */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {genres.map((g: any) => (
                    <span key={g.id} className="px-3 py-1 rounded-full text-xs text-white/70"
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons — poussés à droite */}
              <div className="flex items-center gap-3 ml-auto flex-shrink-0">
                <button
                  onClick={toggleFavorite}
                  disabled={togglingFav}
                  className="flex items-center gap-2 bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-white font-semibold px-5 py-3 rounded-xl border border-white/10 transition-all duration-150 backdrop-blur-sm"
                >
                  {togglingFav ? <Loader2 className="w-5 h-5 animate-spin" /> : isFavorite ? <Check className="w-5 h-5 text-green-400" /> : <Plus className="w-5 h-5" />}
                  <span className="text-sm">{isFavorite ? 'Ajouté' : 'Ma liste'}</span>
                </button>
                <button
                  onClick={() => {
                    if (onClose) onClose()
                    const from = encodeURIComponent(window.location.pathname + window.location.search)
                    router.push(`/watch/${type}/${tmdbId}?play=1${type === 'series' ? `&season=${currentSeason}&episode=${currentEpisode}` : ''}&from=${from}`)
                  }}
                  className="flex items-center gap-2.5 bg-white hover:bg-white/90 active:scale-95 text-black font-bold px-6 py-3 rounded-xl transition-all duration-150 shadow-lg"
                >
                  <Play className="w-5 h-5 fill-black" />
                  <span className="text-base tracking-wide">Regarder</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── PAGE HERO: layout original avec poster tilted ── */
          <div className="relative container mx-auto px-6 py-12 pt-6 flex items-center gap-10" style={{marginTop: '16px'}}>
            {/* Tilted poster */}
            <motion.div
              initial={{ opacity: 0, x: -30, rotate: -6 }}
              animate={{ opacity: 1, x: 0, rotate: -4 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="hidden md:block flex-shrink-0 relative"
              style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0))' }}
            >
              <div className="absolute -top-3 -right-3 z-10 w-12 h-12 bg-zinc-900 rounded-full border-2 border-yellow-500/30 flex flex-col items-center justify-center shadow-xl">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 font-bold text-xs">{voteAverage.toFixed(1)}</span>
              </div>
              <Image src={getTMDBPosterUrl(posterPath, 'w342')} alt={title} width={180} height={270}
                className="rounded-2xl" style={{ transform: 'rotate(-4deg)' }} />
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex-1 max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider">
                  {type === 'movie' ? 'Film' : 'Série'}
                </span>
                {releaseDate && <span className="text-white/50 text-sm">{formatYear(releaseDate)}</span>}
                {runtime && (<><span className="text-white/30">·</span><span className="text-white/50 text-sm">{formatRuntime(runtime)}</span></>)}
                {seriesDetails && (<><span className="text-white/30">·</span><span className="text-white/50 text-sm">{totalSeasons} saison{totalSeasons > 1 ? 's' : ''}</span></>)}
              </div>

              {logo ? (
                <div className="mb-4">
                  <Image src={logo} alt={title} width={380} height={160}
                    className="object-contain object-left max-h-[140px] w-auto drop-shadow-2xl"
                    style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.6))' }} />
                </div>
              ) : (
                <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight tracking-tight">{title}</h1>
              )}

              <p className="text-white/60 text-base leading-relaxed mb-6 max-w-xl">
                {showFullSynopsis ? overview : synopsisShort}
                {overview.length > 200 && (
                  <button onClick={() => setShowFullSynopsis(!showFullSynopsis)} className="text-primary ml-1 hover:underline text-sm">
                    {showFullSynopsis ? 'Moins' : 'Plus'}
                  </button>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => router.push(`/watch/${type}/${tmdbId}?play=1${type === 'series' ? `&season=${currentSeason}&episode=${currentEpisode}` : ''}`)}
                  className="flex items-center gap-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold px-6 py-3 rounded-xl transition-all duration-150 shadow-lg shadow-red-900/40"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span className="text-base tracking-wide">Regarder</span>
                </button>
                <button
                  onClick={toggleFavorite}
                  disabled={togglingFav}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-semibold px-5 py-3 rounded-xl border border-white/10 transition-all duration-150"
                >
                  {togglingFav ? <Loader2 className="w-5 h-5 animate-spin" /> : isFavorite ? <Check className="w-5 h-5 text-green-400" /> : <Plus className="w-5 h-5" />}
                  <span className="text-sm">{isFavorite ? 'Ajouté' : 'Ma liste'}</span>
                </button>
                <button
                  onClick={() => { if (navigator.share) { navigator.share({ title, url: location.href }) } else { navigator.clipboard?.writeText(location.href) } }}
                  className="flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white w-12 h-12 rounded-xl border border-white/10 transition-all duration-150"
                  title="Partager"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
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

      {/* All sections */}
      <div className="container mx-auto px-6 mt-12 pb-20 space-y-16">

        {/* Synopsis + Informations */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
          {/* Left: Synopsis + Genres */}
          <div className="space-y-10">
            {/* Synopsis */}
            <div>
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 mb-5">
                <span className="w-[3px] h-4 bg-red-500 rounded-full inline-block" />
                Synopsis
              </h2>
              <p className="text-white/70 text-base leading-relaxed max-w-2xl">
                {overview || 'Aucune description disponible.'}
              </p>
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 mb-4">
                  <span className="w-[3px] h-4 bg-red-500 rounded-full inline-block" />
                  Genres
                </h2>
                <div className="flex flex-wrap gap-2">
                  {genres.map((g: any) => (
                    <span key={g.id} className="px-4 py-1.5 rounded-full text-sm text-white/80 font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Informations */}
          <div>
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 mb-5">
              <span className="w-[3px] h-4 bg-red-500 rounded-full inline-block" />
              Informations
            </h2>
            <div className="space-y-2">
              {releaseDate && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2.5 text-white/40 text-sm">
                    <Calendar className="w-4 h-4" />
                    Sortie
                  </div>
                  <span className="text-white font-bold text-sm">{formatYear(releaseDate)}</span>
                </div>
              )}
              {runtime && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2.5 text-white/40 text-sm">
                    <Clock className="w-4 h-4" />
                    Durée
                  </div>
                  <span className="text-white font-bold text-sm">{formatRuntime(runtime)}</span>
                </div>
              )}
              {type === 'series' && totalSeasons > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2.5 text-white/40 text-sm">
                    <Tv className="w-4 h-4" />
                    Saisons
                  </div>
                  <span className="text-white font-bold text-sm">{totalSeasons}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2.5 text-white/40 text-sm">
                  <Film className="w-4 h-4" />
                  Langue
                </div>
                <span className="text-white font-bold text-sm">
                  {(details as any)?.original_language === 'fr' ? 'Français' :
                   (details as any)?.original_language === 'en' ? 'Anglais' :
                   (details as any)?.original_language === 'es' ? 'Espagnol' :
                   (details as any)?.original_language === 'ja' ? 'Japonais' :
                   (details as any)?.original_language?.toUpperCase() || 'N/A'}
                </span>
              </div>
              {voteAverage > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2.5 text-white/40 text-sm">
                    <Star className="w-4 h-4" />
                    Note TMDB
                  </div>
                  <span className="text-white font-bold text-sm">{voteAverage.toFixed(1)} / 10</span>
                </div>
              )}
              {directors.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2.5 text-white/40 text-sm">
                    <User className="w-4 h-4" />
                    Réalisateur
                  </div>
                  <span className="text-white font-bold text-sm text-right max-w-[160px] truncate">{directors.map(d => d.name).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Casting */}
        {cast.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 mb-6">
              <span className="w-[3px] h-4 bg-red-500 rounded-full inline-block" />
              Casting · {cast.length} acteurs
            </h2>
            <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide">
              {cast.map((actor: any) => (
                <div key={actor.id} className="flex-shrink-0 w-[110px] group">
                  <div className="relative w-[110px] h-[140px] rounded-2xl overflow-hidden mb-3 bg-white/5"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    <Image src={getTMDBProfileUrl(actor.profile_path)} alt={actor.name} fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />
                  </div>
                  <p className="text-white text-xs font-semibold leading-tight mb-0.5 truncate">{actor.name}</p>
                  <p className="text-white/35 text-xs truncate italic">{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saga / Collection */}
        {collection && collection.parts.length > 1 && (
          <div>
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 mb-6">
              <span className="w-[3px] h-4 bg-red-500 rounded-full inline-block" />
              {collection.name} · {collection.parts.length} films
            </h2>
            <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide">
              {collection.parts.map((item) => {
                const isCurrent = item.id === tmdbId
                return (
                  <Link key={item.id} href={`/watch/movie/${item.id}`}>
                    <div className="flex-shrink-0 w-[155px] cursor-pointer group">
                      <div
                        className="relative w-[155px] h-[220px] rounded-2xl overflow-hidden mb-3"
                        style={{
                          border: isCurrent ? '2px solid rgb(239,68,68)' : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isCurrent ? '0 0 20px rgba(239,68,68,0.3)' : '0 8px 24px rgba(0,0,0,0.4)',
                          background: 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <Image
                          src={getTMDBPosterUrl(item.poster_path)}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)' }} />

                        {/* EN COURS badge */}
                        {isCurrent && (
                          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white uppercase tracking-wide"
                            style={{ background: 'rgb(239,68,68)', boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}>
                            En cours
                          </div>
                        )}

                        {item.vote_average > 0 && (
                          <div className="absolute bottom-2.5 left-2.5">
                            <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">Note</p>
                            <p className="text-white text-base font-bold leading-tight">{item.vote_average.toFixed(1)}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-white text-xs font-bold leading-tight mb-1 line-clamp-2">{item.title}</p>
                      {item.release_date && (
                        <span className="text-white/30 text-[11px] font-semibold">{formatYear(item.release_date)}</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Films similaires */}
        {similar.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 mb-6">
              <span className="w-[3px] h-4 bg-red-500 rounded-full inline-block" />
              {type === 'series' ? 'Séries similaires' : 'Films similaires'}
            </h2>
            <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide">
              {similar.slice(0, 12).map((item: any) => {
                const t = item.title || item.name
                const d = item.release_date || item.first_air_date
                const vote = item.vote_average
                const genreNames = (item.genre_ids || []).slice(0, 1).map((id: number) => {
                  const map: Record<number, string> = { 28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime', 99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 14: 'Fantasy', 36: 'Histoire', 27: 'Horreur', 10402: 'Musique', 9648: 'Mystère', 10749: 'Romance', 878: 'Science-Fiction', 10770: 'Téléfilm', 53: 'Thriller', 10752: 'Guerre', 37: 'Western' }
                  return map[id] || ''
                }).filter(Boolean)
                return (
                  <Link key={item.id} href={`/watch/${type}/${item.id}`}>
                    <div className="flex-shrink-0 w-[155px] cursor-pointer group">
                      <div className="relative w-[155px] h-[220px] rounded-2xl overflow-hidden mb-3 bg-white/5"
                        style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                        <Image src={getTMDBPosterUrl(item.poster_path)} alt={t} fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />
                        {vote > 0 && (
                          <div className="absolute bottom-2.5 left-2.5 text-left">
                            <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">Note</p>
                            <p className="text-white text-base font-bold leading-tight">{vote.toFixed(1)}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-white text-xs font-bold leading-tight mb-1 line-clamp-2">{t}</p>
                      <div className="flex items-center gap-2">
                        {d && <span className="text-white/30 text-[11px] font-semibold">{formatYear(d)}</span>}
                        {genreNames.length > 0 && <span className="text-white/30 text-[11px] font-semibold uppercase tracking-wide">{genreNames[0]}</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
