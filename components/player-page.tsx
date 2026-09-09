'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Play, Plus, Check, Star, Share2, Heart, X } from 'lucide-react'
import useSWR from 'swr'
import { useDrawer } from '@/components/movie-drawer'
import {
  getTMDBPosterUrl, getTMDBBackdropUrl, getTMDBProfileUrl,
  formatRuntime, formatYear,
  type TMDBCredits, type TMDBMovieDetails, type TMDBSeriesDetails, type TMDBEpisode, type TMDBVideo,
} from '@/lib/tmdb'
import { EpisodeList } from '@/components/episode-list'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface PlayerPageProps {
  type: 'movie' | 'series'
  tmdbId: number
  initialSeason?: number
  initialEpisode?: number
  playerUrl: string
  userId?: string | null
  profileId?: string | null
  poster?: string | null
  isDrawer?: boolean
  onClose?: () => void
}

export function PlayerPage({
  type, tmdbId, initialSeason = 1, initialEpisode = 1,
  userId, profileId, isDrawer = false, onClose,
}: PlayerPageProps) {
  const router = useRouter()
  const { openDrawer } = useDrawer()
  const [currentSeason, setCurrentSeason] = useState(initialSeason)
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode)
  const [isFavorite, setIsFavorite] = useState(false)
  const [togglingFav, setTogglingFav] = useState(false)
  const [synopsisOpen, setSynopsisOpen] = useState(false)
  const [trailerOpen, setTrailerOpen] = useState(false)

  const { data, isLoading } = useSWR(
    `/api/content/${type}/${tmdbId}${type === 'series' ? `?season=${currentSeason}` : ''}`,
    fetcher,
  )

  const details = data?.details as TMDBMovieDetails | TMDBSeriesDetails | undefined
  const credits = data?.credits as TMDBCredits | undefined
  const similar = (data?.similar || []) as any[]
  const collection = (data?.collection || null) as { id: number; name: string; parts: { id: number; title: string; poster_path: string | null; release_date: string; vote_average: number }[] } | null
  const episodes = (data?.seasonData?.episodes || []) as TMDBEpisode[]
  const videos = (data?.videos || []) as TMDBVideo[]
  const logoUrl = (data?.logo as string | null) || null

  const movieDetails = type === 'movie' ? details as TMDBMovieDetails : null
  const seriesDetails = type === 'series' ? details as TMDBSeriesDetails : null

  const title = movieDetails?.title || seriesDetails?.name || ''
  const overview = details?.overview || ''
  const tagline = (details as any)?.tagline as string | undefined
  const posterPath = details?.poster_path || null
  const backdropPath = details?.backdrop_path || null
  const voteAverage = details?.vote_average || 0
  const releaseDate = movieDetails?.release_date || seriesDetails?.first_air_date || ''
  const genres = details?.genres || []
  const runtime = movieDetails?.runtime
  const totalSeasons = seriesDetails?.number_of_seasons || 1
  const cast = credits?.cast?.slice(0, 14) || []

  const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
    || videos.find(v => v.site === 'YouTube' && v.type === 'Teaser')
    || videos.find(v => v.site === 'YouTube')

  useEffect(() => {
    const id = profileId || userId
    if (!id) return
    const param = profileId ? `profile_id=${profileId}` : `user_id=${userId}`
    fetch(`/api/favorites?${param}`)
      .then(r => r.json())
      .then((favs: any[]) => {
        if (Array.isArray(favs)) setIsFavorite(favs.some(f => f.tmdb_id === tmdbId && f.content_type === type))
      }).catch(() => {})
  }, [userId, profileId, tmdbId, type])

  const [watchProgress, setWatchProgress] = useState(0)
  const [resumeSeason, setResumeSeason] = useState<number | null>(null)
  const [resumeEpisode, setResumeEpisode] = useState<number | null>(null)

  useEffect(() => {
    if (!tmdbId) return
    const param = profileId ? `profile_id=${profileId}` : userId ? `user_id=${userId}` : ''
    fetch(`/api/watch-history${param ? `?${param}` : ''}`)
      .then(r => r.json())
      .then((rows: any[]) => {
        if (!Array.isArray(rows)) return
        const match = rows.find(item => (item.tmdb_id ?? item.content_id) === tmdbId && item.content_type === type && !item.finished)
        if (match && match.progress > 0 && match.progress < 98) {
          setWatchProgress(match.progress)
          if (type === 'series' && match.season && match.episode) {
            setResumeSeason(match.season)
            setResumeEpisode(match.episode)
          }
        }
      }).catch(() => {})
  }, [userId, profileId, tmdbId, type])

  const toggleFavorite = async () => {
    const id = profileId || userId
    if (!id) { alert('Connectez-vous pour ajouter aux favoris'); return }
    setTogglingFav(true)
    try {
      if (isFavorite) {
        const param = profileId ? `profile_id=${profileId}` : `user_id=${userId}`
        await fetch(`/api/favorites?tmdb_id=${tmdbId}&content_type=${type}&${param}`, { method: 'DELETE' })
        setIsFavorite(false)
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profileId ? null : userId,
            profile_id: profileId || null,
            tmdb_id: tmdbId, content_type: type, title, poster: posterPath,
          }),
        })
        setIsFavorite(true)
      }
    } catch (e) { console.error(e) }
    setTogglingFav(false)
  }

  const play = () => {
    if (onClose) onClose()
    const season = resumeSeason ?? currentSeason
    const episode = resumeEpisode ?? currentEpisode
    router.push(`/watch/${type}/${tmdbId}?play=1${type === 'series' ? `&season=${season}&episode=${episode}` : ''}`)
  }

  const share = () => {
    if (navigator.share) navigator.share({ title, url: location.href })
    else navigator.clipboard?.writeText(location.href)
  }

  if (isLoading || !details) {
    return (
      <div className="min-h-dvh bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-white animate-spin" />
      </div>
    )
  }

  const metaBits = [
    releaseDate ? formatYear(releaseDate) : null,
    runtime ? formatRuntime(runtime) : null,
    type === 'series' ? `${totalSeasons} saison${totalSeasons > 1 ? 's' : ''}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-dvh bg-[#050505] text-white">
      <section className="relative min-h-[85dvh] md:min-h-[92dvh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-[#050505]" />
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={backdropPath ? getTMDBBackdropUrl(backdropPath, 'original') : getTMDBPosterUrl(posterPath, 'w780')}
            alt=""
            fill
            priority
            className="object-cover object-center title-kenburns"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/20 to-black/25" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-8 pt-28 pb-12">
          <div className="flex-1 flex flex-col justify-end min-h-[58vh] md:min-h-[62vh] max-w-3xl">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={title}
                className="h-14 md:h-24 max-w-[280px] md:max-w-[460px] object-contain object-left mb-4 drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]"
              />
            ) : (
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black mb-3 leading-[1.05] tracking-tight">
                {title}
              </h1>
            )}

            {tagline ? (
              <p className="text-sm text-zinc-400 mb-3 italic">{tagline}</p>
            ) : null}

            <div className="flex items-center gap-2 mb-5 flex-wrap text-xs text-zinc-400 font-medium">
              {metaBits.map((bit, i) => (
                <span key={bit} className="flex items-center gap-2">
                  {i > 0 && <span className="text-zinc-600">·</span>}
                  <span className="text-white font-semibold">{bit}</span>
                </span>
              ))}
              {voteAverage > 0 && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {voteAverage.toFixed(1)}
                  </span>
                </>
              )}
              {genres.slice(0, 3).map(g => (
                <span key={g.id} className="flex items-center gap-2">
                  <span className="text-zinc-600">·</span>
                  {g.name}
                </span>
              ))}
            </div>

            {overview && (
              <div className="mb-6 max-w-3xl">
                <p className={`text-zinc-300 leading-relaxed text-sm md:text-[15px] ${synopsisOpen ? '' : 'line-clamp-3'}`}>
                  {overview}
                </p>
                {overview.length > 180 && (
                  <button
                    type="button"
                    onClick={() => setSynopsisOpen(v => !v)}
                    className="text-xs text-red-400 hover:text-red-300 font-bold mt-1.5"
                  >
                    {synopsisOpen ? 'Moins' : 'Plus'}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={play}
                className="h-12 px-7 rounded-2xl bg-white text-black font-extrabold text-sm inline-flex items-center gap-2.5 hover:bg-zinc-100 active:scale-95 shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
              >
                <Play className="w-4 h-4 fill-current" />
                {watchProgress > 0 ? 'Reprendre' : 'Regarder'}
                {watchProgress > 0 && <span className="text-xs opacity-60">{Math.round(watchProgress)}%</span>}
              </button>

              <button
                type="button"
                onClick={toggleFavorite}
                disabled={togglingFav}
                className={`h-12 px-4 rounded-2xl backdrop-blur-md border font-semibold text-xs inline-flex items-center gap-2 shrink-0 ${
                  isFavorite
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-zinc-200'
                }`}
              >
                {isFavorite ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                Ma liste
              </button>

              {trailer && (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="h-12 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-zinc-200 font-semibold text-xs inline-flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  Bande-annonce
                </button>
              )}

              <button
                type="button"
                onClick={share}
                className="w-12 h-12 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-zinc-300 hover:text-white inline-flex items-center justify-center"
                aria-label="Partager"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleFavorite}
                disabled={togglingFav}
                className={`w-12 h-12 rounded-2xl border inline-flex items-center justify-center ${
                  isFavorite
                    ? 'bg-red-600/15 border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white'
                    : 'bg-white/[0.06] border-white/[0.08] text-zinc-300 hover:text-white'
                }`}
                aria-label="Favori"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-30 max-w-[1400px] mx-auto px-5 md:px-8 py-12 space-y-16">
        {type === 'series' && (
          <section>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-6">Épisodes</h2>
            <EpisodeList
              episodes={episodes}
              currentSeason={currentSeason}
              currentEpisode={currentEpisode}
              totalSeasons={totalSeasons}
              tmdbId={tmdbId}
              onSeasonChange={v => {
                setCurrentSeason(v)
                setCurrentEpisode(1)
                if (!isDrawer) router.push(`/title/series/${tmdbId}?season=${v}`)
              }}
              onClose={onClose}
              isDrawer={isDrawer}
            />
          </section>
        )}

        {cast.length > 0 && (
          <section>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-6">Casting</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar">
              {cast.map((actor: any) => (
                <div key={actor.id} className="flex-none w-28 md:w-32">
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2 bg-zinc-800">
                    <Image src={getTMDBProfileUrl(actor.profile_path)} alt={actor.name} fill className="object-cover" sizes="128px" />
                  </div>
                  <p className="text-xs font-bold truncate">{actor.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{actor.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {trailer && (
          <section>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-6">Bande-annonce</h2>
            <button
              type="button"
              onClick={() => setTrailerOpen(true)}
              className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden border border-white/10 group text-left"
            >
              <Image
                src={backdropPath ? getTMDBBackdropUrl(backdropPath, 'w1280') : getTMDBPosterUrl(posterPath, 'w780')}
                alt=""
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="768px"
              />
              <span className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/40">
                <span className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 text-white ml-1" />
                </span>
              </span>
            </button>
          </section>
        )}

        {collection && collection.parts.length > 1 && (
          <PosterRail
            label={collection.name}
            items={collection.parts.map(p => ({
              id: p.id, title: p.title, poster: p.poster_path, year: p.release_date, current: p.id === tmdbId,
            }))}
            onOpen={id => openDrawer('movie', id)}
          />
        )}

        {similar.length > 0 && (
          <PosterRail
            label="Similaires"
            items={similar.slice(0, 16).map((item: any) => ({
              id: item.id,
              title: item.title || item.name,
              poster: item.poster_path,
              year: item.release_date || item.first_air_date,
            }))}
            onOpen={id => openDrawer(type, id)}
          />
        )}
      </div>

      {trailerOpen && trailer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <button type="button" className="absolute inset-0 bg-black/90 backdrop-blur-md" aria-label="Fermer" onClick={() => setTrailerOpen(false)} />
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setTrailerOpen(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-red-600"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
              title="Bande-annonce"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function PosterRail({
  label, items, onOpen,
}: {
  label: string
  items: { id: number; title: string; poster: string | null; year?: string; current?: boolean }[]
  onOpen: (id: number) => void
}) {
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-6">{label}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 hide-scrollbar">
        {items.map(item => (
          <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="flex-none w-32 md:w-36 text-left group">
            <div className={`relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 bg-zinc-800 ${item.current ? 'ring-1 ring-red-500/50' : 'group-hover:ring-1 group-hover:ring-red-500/30'}`}>
              <Image src={getTMDBPosterUrl(item.poster)} alt={item.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="144px" />
            </div>
            <p className="text-xs font-bold truncate">{item.title}</p>
            {item.year && <p className="text-[11px] text-zinc-400 truncate">{formatYear(item.year)}</p>}
          </button>
        ))}
      </div>
    </section>
  )
}
