export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { EmbedPlayer } from '@/components/embed-player'
import { Loading } from '@/components/loading'
import { getEpisodeVideoUrl, getMovieVideoUrl, getMovieById, getSeriesById } from '@/lib/fastflux'
import { getMovieDetails, getSeriesDetails } from '@/lib/tmdb'

interface EmbedPageProps {
  params: Promise<{ type: string; id: string }>
  searchParams: Promise<{ season?: string; episode?: string; play?: string }>
}

async function EmbedContent({
  type, id, season, episode,
}: {
  type: 'movie' | 'series'
  id: string
  season: number
  episode: number
}) {
  const tmdbId = parseInt(id)
  let playerUrl: string | null = null
  let title = ''
  let seriesDbId: number | undefined
  let seriesName: string | null = null

  if (type === 'movie') {
    const movie = await getMovieById(tmdbId)
    title = movie?.title || 'Film'

    if (movie?.video_url) {
      playerUrl = movie.video_url
    } else {
      let titleForPurstream = movie?.title || movie?.original_title
      if (!titleForPurstream) {
        const tmdbDetails = await getMovieDetails(tmdbId).catch(() => null)
        titleForPurstream = tmdbDetails?.title || tmdbDetails?.original_title || ''
        if (tmdbDetails?.title) title = tmdbDetails.title
      }
      playerUrl = await getMovieVideoUrl(tmdbId, titleForPurstream || undefined)
    }
  } else {
    const series = await getSeriesById(tmdbId)
    seriesDbId = series?.id
    seriesName = series?.name || null
    title = `${series?.name || 'Série'} — S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`

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
  }

  return (
    <EmbedPlayer
      videoUrl={playerUrl}
      title={title}
      type={type}
      tmdbId={tmdbId}
      seriesDbId={seriesDbId}
      currentSeason={season}
      currentEpisode={episode}
      seriesName={seriesName}
    />
  )
}

export default async function EmbedPage({ params, searchParams }: EmbedPageProps) {
  const { type, id } = await params
  const search = await searchParams

  if (type !== 'movie' && type !== 'series') notFound()

  const season = parseInt(search.season || '1')
  const episode = parseInt(search.episode || '1')

  return (
    <Suspense fallback={<Loading />}>
      <EmbedContent type={type as 'movie' | 'series'} id={id} season={season} episode={episode} />
    </Suspense>
  )
}
