import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { PlayerPage } from '@/components/player-page'
import { NativePlayer } from '@/components/native-player'
import { Loading } from '@/components/loading'
import { getEpisodeVideoUrl, getMovieById, getSeriesById, getPosterUrl, getMovieVideoUrl } from '@/lib/fastflux'
import { getMovieDetails, getSeriesDetails } from '@/lib/tmdb'
import { getSession } from '@/lib/auth'

interface WatchPageProps {
  params: Promise<{ type: string; id: string }>
  searchParams: Promise<{ season?: string; episode?: string; play?: string; from?: string }>
}

async function WatchContent({
  type, id, season, episode, play, from,
}: {
  type: 'movie' | 'series'
  id: string
  season: number
  episode: number
  play: boolean
  from?: string
}) {
  const tmdbId = parseInt(id)
  const user = await getSession()

  let playerUrl: string | null = null
  let title = ''
  let seriesDbId: number | undefined
  let poster: string | null = null
  let seriesName: string | null = null

  if (type === 'movie') {
    // Essaye d'abord la BDD, récupère le titre depuis TMDB si nécessaire
    const movie = await getMovieById(tmdbId)
    title = movie?.title || 'Film'

    if (movie?.video_url) {
      playerUrl = movie.video_url
    } else {
      // Pas de video_url en BDD → récupère le titre TMDB pour Purstream
      let titleForPurstream = movie?.title || movie?.original_title
      if (!titleForPurstream) {
        const tmdbDetails = await getMovieDetails(tmdbId).catch(() => null)
        titleForPurstream = tmdbDetails?.title || tmdbDetails?.original_title || ''
        if (tmdbDetails?.title) title = tmdbDetails.title
      }
      playerUrl = await getMovieVideoUrl(tmdbId, titleForPurstream || undefined)
    }

    poster = movie?.poster_path ? getPosterUrl(movie.poster_path) : null
    // Si pas de poster en BDD, on laisse null (PlayerPage gère le fallback via TMDB)

  } else {
    const series = await getSeriesById(tmdbId)
    seriesDbId = series?.id
    seriesName = series?.name || null
    title = `${series?.name || 'Série'} — S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`

    // Récupère le titre depuis TMDB si la série n'est pas en BDD
    let titleForPurstream = series?.name || series?.original_name
    if (!titleForPurstream) {
      const tmdbDetails = await getSeriesDetails(tmdbId).catch(() => null)
      titleForPurstream = tmdbDetails?.name || tmdbDetails?.original_name || ''
      if (tmdbDetails?.name) {
        seriesName = tmdbDetails.name
        title = `${tmdbDetails.name} — S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`
      }
    }

    playerUrl = await getEpisodeVideoUrl(tmdbId, season, episode, titleForPurstream || undefined)
    poster = series?.poster_path ? getPosterUrl(series.poster_path) : null
  }

  const backUrl = from
    ? decodeURIComponent(from)
    : type === 'series' ? `/watch/series/${id}?season=${season}&episode=${episode}` : '/'

  if (play) {
    return (
      <NativePlayer
        videoUrl={playerUrl}
        title={title}
        backUrl={backUrl}
        type={type}
        tmdbId={tmdbId}
        seriesDbId={seriesDbId}
        currentSeason={season}
        currentEpisode={episode}
        userId={user?.id || null}
        poster={poster}
        seriesName={seriesName}
      />
    )
  }

  return (
    <PlayerPage
      type={type}
      tmdbId={tmdbId}
      playerUrl={playerUrl || ''}
      initialSeason={season}
      initialEpisode={episode}
      userId={user?.id || null}
    />
  )
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { type, id } = await params
  const search = await searchParams

  if (type !== 'movie' && type !== 'series') notFound()

  const season = parseInt(search.season || '1')
  const episode = parseInt(search.episode || '1')
  const play = search.play === '1'
  const from = search.from

  return (
    <Suspense fallback={<Loading />}>
      <WatchContent type={type as 'movie'|'series'} id={id} season={season} episode={episode} play={play} from={from} />
    </Suspense>
  )
}
