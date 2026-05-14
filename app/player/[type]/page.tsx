import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getMovieVideoUrl, getEpisodeVideoUrl, getMovieById, getSeriesById } from '@/lib/fastflux'
import { NativePlayer } from '@/components/native-player'
import { Loading } from '@/components/loading'

interface PlayerPageProps {
  params: Promise<{ type: string; id: string }>
  searchParams: Promise<{ season?: string; episode?: string }>
}

async function PlayerContent({ type, id, season, episode }: {
  type: 'movie' | 'series'
  id: string
  season: number
  episode: number
}) {
  const tmdbId = parseInt(id)

  let videoUrl: string | null = null
  let title = ''

  if (type === 'movie') {
    const movie = await getMovieById(tmdbId)
    title = movie?.title || 'Film'
    videoUrl = movie?.video_url || null
  } else {
    const series = await getSeriesById(tmdbId)
    title = `${series?.name || 'Série'} — S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
    videoUrl = await getEpisodeVideoUrl(tmdbId, season, episode)
  }

  return <NativePlayer videoUrl={videoUrl} title={title} backUrl={`/watch/${type}/${id}${type === 'series' ? `?season=${season}&episode=${episode}` : ''}`} />
}

export default async function PlayerRoutePage({ params, searchParams }: PlayerPageProps) {
  const { type, id } = await params
  const search = await searchParams

  if (type !== 'movie' && type !== 'series') notFound()

  const season = parseInt(search.season || '1')
  const episode = parseInt(search.episode || '1')

  return (
    <Suspense fallback={<Loading />}>
      <PlayerContent type={type as 'movie' | 'series'} id={id} season={season} episode={episode} />
    </Suspense>
  )
}