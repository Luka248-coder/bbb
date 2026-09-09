'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Play, Plus, Check, Star, Clock, Calendar, Share2, Loader2,
  Film, Tv, User, ArrowLeft,
} from 'lucide-react'
import useSWR from 'swr'
import { useDrawer } from '@/components/movie-drawer'
import {
  getTMDBPosterUrl, getTMDBProfileUrl,
  formatRuntime, formatYear, getDirectors,
  type TMDBCredits, type TMDBMovieDetails, type TMDBSeriesDetails, type TMDBEpisode,
} from '@/lib/tmdb'
import { EpisodeList } from '@/components/episode-list'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const LANG: Record<string, string> = {
  fr: 'Français', en: 'Anglais', es: 'Espagnol', ja: 'Japonais',
  ko: 'Coréen', de: 'Allemand', it: 'Italien', zh: 'Chinois',
}

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
  const [showFullSynopsis, setShowFullSynopsis] = useState(false)

  const { data, isLoading } = useSWR(
    `/api/content/${type}/${tmdbId}${type === 'series' ? `?season=${currentSeason}` : ''}`,
    fetcher,
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
  const tagline = (details as any)?.tagline as string | undefined
  const originalLanguage = (details as any)?.original_language as string | undefined
  const cast = credits?.cast?.slice(0, 14) || []
  const directors = getDirectors(credits || null)

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

  if (isLoading || !details) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/15 border-t-red-500 animate-spin" />
      </div>
    )
  }

  const synopsisShort = overview.length > 220 ? overview.slice(0, 220).trim() + '…' : overview

  return (
    <div className="min-h-screen bg-[#08080a] text-white">
      <section className="relative min-h-[88vh] flex flex-col justify-end overflow-hidden">
        {backdropPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/original${backdropPath}`}
            alt=""
            fill
            priority
            className="object-cover object-top"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/55 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080a]/90 via-[#08080a]/30 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.16),transparent_50%)]" />

        <div className="relative z-10 max-w-[1400px] w-full mx-auto px-4 md:px-8 pt-28 pb-12 md:pb-16">
          <button
            type="button"
            onClick={() => { if (window.history.length > 1) router.back(); else router.push('/') }}
            className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm font-medium mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          <div className="flex items-end gap-8">
            {posterPath && (
              <div className="hidden md:block relative w-[210px] shrink-0 aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl">
                <Image src={getTMDBPosterUrl(posterPath, 'w500')} alt={title} fill className="object-cover" sizes="210px" />
              </div>
            )}

            <div className="min-w-0 flex-1 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="px-2.5 py-1 rounded-full bg-red-600 text-[10px] font-extrabold tracking-[0.16em] uppercase">
                  {type === 'movie' ? 'Film' : 'Série'}
                </span>
                {releaseDate && <span className="text-white/50 text-sm font-medium">{formatYear(releaseDate)}</span>}
                {runtime ? <span className="text-white/35 text-sm">{formatRuntime(runtime)}</span> : null}
                {seriesDetails && (
                  <span className="text-white/35 text-sm">{totalSeasons} saison{totalSeasons > 1 ? 's' : ''}</span>
                )}
                {voteAverage > 0 && (
                  <span className="inline-flex items-center gap-1 text-white text-sm font-bold">
                    <Star className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                    {voteAverage.toFixed(1)}
                  </span>
                )}
              </div>

              {logo ? (
                <Image
                  src={logo}
                  alt={title}
                  width={420}
                  height={140}
                  className="object-contain object-left max-h-[92px] md:max-h-[120px] w-auto mb-4 drop-shadow-2xl"
                />
              ) : (
                <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] mb-4">{title}</h1>
              )}

              {tagline && (
                <p className="text-white/45 text-sm italic mb-3">{tagline}</p>
              )}

              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {genres.map((g: { id: number; name: string }) => (
                    <span key={g.id} className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white/65 bg-white/8 border border-white/10">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {overview && (
                <p className="text-white/65 text-[15px] leading-relaxed mb-6 max-w-xl">
                  {showFullSynopsis ? overview : synopsisShort}
                  {overview.length > 220 && (
                    <button type="button" onClick={() => setShowFullSynopsis(v => !v)} className="text-red-400 ml-1.5 font-semibold hover:text-red-300">
                      {showFullSynopsis ? 'Moins' : 'Plus'}
                    </button>
                  )}
                </p>
              )}

              {watchProgress > 0 && (
                <div className="max-w-xs mb-5">
                  <div className="h-1 rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${watchProgress}%` }} />
                  </div>
                  <p className="text-white/40 text-[11px] mt-1.5">{watchProgress}% vu</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={play}
                  className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-black tracking-widest uppercase shadow-lg shadow-red-900/40"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {watchProgress > 0 ? 'Reprendre' : 'Lecture'}
                </button>
                <button
                  type="button"
                  onClick={toggleFavorite}
                  disabled={togglingFav}
                  className="h-12 px-5 rounded-full bg-white/10 border border-white/12 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-white/16"
                >
                  {togglingFav ? <Loader2 className="w-4 h-4 animate-spin" /> : isFavorite ? <Check className="w-4 h-4 text-red-400" /> : <Plus className="w-4 h-4" />}
                  {isFavorite ? 'Ajouté' : 'Ma liste'}
                </button>
                <button
                  type="button"
                  onClick={() => { if (navigator.share) navigator.share({ title, url: location.href }); else navigator.clipboard?.writeText(location.href) }}
                  className="w-12 h-12 rounded-full bg-white/10 border border-white/12 flex items-center justify-center hover:bg-white/16"
                  aria-label="Partager"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {type === 'series' && episodes.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
          <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-red-500 mb-5">Épisodes</p>
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
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pb-24 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-red-500 mb-4">Synopsis</p>
            <p className="text-white/70 text-base leading-relaxed max-w-2xl">
              {overview || 'Aucune description disponible.'}
            </p>
          </div>
          <dl className="space-y-4 text-sm">
            <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-red-500 mb-4">Infos</p>
            {releaseDate && (
              <div className="flex justify-between gap-4 border-b border-white/8 pb-3">
                <dt className="text-white/40 inline-flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Sortie</dt>
                <dd className="font-semibold">{formatYear(releaseDate)}</dd>
              </div>
            )}
            {runtime ? (
              <div className="flex justify-between gap-4 border-b border-white/8 pb-3">
                <dt className="text-white/40 inline-flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Durée</dt>
                <dd className="font-semibold">{formatRuntime(runtime)}</dd>
              </div>
            ) : null}
            {type === 'series' && (
              <div className="flex justify-between gap-4 border-b border-white/8 pb-3">
                <dt className="text-white/40 inline-flex items-center gap-2"><Tv className="w-3.5 h-3.5" /> Saisons</dt>
                <dd className="font-semibold">{totalSeasons}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-b border-white/8 pb-3">
              <dt className="text-white/40 inline-flex items-center gap-2"><Film className="w-3.5 h-3.5" /> Langue</dt>
              <dd className="font-semibold">{LANG[originalLanguage || ''] || originalLanguage?.toUpperCase() || '—'}</dd>
            </div>
            {directors.length > 0 && (
              <div className="flex justify-between gap-4 border-b border-white/8 pb-3">
                <dt className="text-white/40 inline-flex items-center gap-2"><User className="w-3.5 h-3.5" /> Réalisation</dt>
                <dd className="font-semibold text-right max-w-[160px]">{directors.map(d => d.name).join(', ')}</dd>
              </div>
            )}
          </dl>
        </div>

        {cast.length > 0 && (
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-red-500 mb-5">Casting</p>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {cast.map((actor: any) => (
                <div key={actor.id} className="shrink-0 w-[92px]">
                  <div className="relative w-[92px] h-[92px] rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 mb-2">
                    <Image src={getTMDBProfileUrl(actor.profile_path)} alt={actor.name} fill className="object-cover" sizes="92px" />
                  </div>
                  <p className="text-white text-[12px] font-semibold leading-tight line-clamp-2">{actor.name}</p>
                  <p className="text-white/35 text-[11px] truncate mt-0.5">{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <TrailerSection tmdbId={tmdbId} type={type} />

        {collection && collection.parts.length > 1 && (
          <PosterRail
            label={collection.name}
            items={collection.parts.map(p => ({
              id: p.id,
              title: p.title,
              poster: p.poster_path,
              year: p.release_date,
              vote: p.vote_average,
              current: p.id === tmdbId,
            }))}
            onOpen={id => openDrawer('movie', id)}
          />
        )}

        {similar.length > 0 && (
          <PosterRail
            label={type === 'series' ? 'Similaires' : 'Similaires'}
            items={similar.slice(0, 14).map((item: any) => ({
              id: item.id,
              title: item.title || item.name,
              poster: item.poster_path,
              year: item.release_date || item.first_air_date,
              vote: item.vote_average,
              current: false,
            }))}
            onOpen={id => openDrawer(type, id)}
          />
        )}
      </div>
    </div>
  )
}

function PosterRail({
  label, items, onOpen,
}: {
  label: string
  items: { id: number; title: string; poster: string | null; year?: string; vote?: number; current?: boolean }[]
  onOpen: (id: number) => void
}) {
  return (
    <div>
      <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-red-500 mb-5">{label}</p>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
        {items.map(item => (
          <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="shrink-0 w-[132px] text-left group">
            <div className={`relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 mb-2 ring-1 ${item.current ? 'ring-red-500' : 'ring-white/10 group-hover:ring-white/25'}`}>
              <Image src={getTMDBPosterUrl(item.poster)} alt={item.title} fill className="object-cover group-hover:scale-[1.04] transition-transform duration-300" sizes="132px" />
              {item.current && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-bold uppercase">Ici</span>
              )}
            </div>
            <p className="text-white text-[12px] font-semibold leading-snug line-clamp-2">{item.title}</p>
            {item.year && <p className="text-white/35 text-[11px] mt-0.5">{formatYear(item.year)}</p>}
          </button>
        ))}
      </div>
    </div>
  )
}

function TrailerSection({ tmdbId, type }: { tmdbId: number; type: 'movie' | 'series' }) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setTrailerKey(null)
    const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
    const base = type === 'movie' ? 'movie' : 'tv'
    const pickBest = (videos: any[], lang: string) => {
      const yt = videos.filter(v => v.site === 'YouTube' && v.iso_639_1 === lang)
      return yt.find(v => v.type === 'Trailer') || yt.find(v => v.type === 'Teaser') || yt[0] || null
    }
    fetch(`https://api.themoviedb.org/3/${base}/${tmdbId}/videos?api_key=${TMDB_KEY}&include_video_language=fr,en`)
      .then(r => r.json())
      .then(data => {
        const videos = data.results || []
        const best = pickBest(videos, 'fr') || pickBest(videos, 'en')
        setTrailerKey(best?.key || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [tmdbId, type])

  if (loading || !trailerKey) return null

  return (
    <div>
      <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-red-500 mb-5">Bande-annonce</p>
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden ring-1 ring-white/10" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={`https://www.youtube.com/embed/${trailerKey}?rel=0&modestbranding=1`}
          title="Bande-annonce"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  )
}
