import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { PlayerPage } from '@/components/player-page'
import { Loading } from '@/components/loading'
import { getSession } from '@/lib/auth'
import { getMovieDetails, getSeriesDetails } from '@/lib/tmdb'

interface TitlePageProps {
  params: Promise<{ type: string; id: string }>
  searchParams: Promise<{ season?: string; episode?: string }>
}

export async function generateMetadata({ params }: TitlePageProps): Promise<Metadata> {
  const { type, id } = await params
  const tmdbId = parseInt(id, 10)
  if (Number.isNaN(tmdbId)) return { title: 'StreamSelf' }
  try {
    if (type === 'movie') {
      const d = await getMovieDetails(tmdbId)
      return { title: d?.title ? `${d.title} - StreamSelf` : 'Film - StreamSelf' }
    }
    if (type === 'series') {
      const d = await getSeriesDetails(tmdbId)
      return { title: d?.name ? `${d.name} - StreamSelf` : 'Série - StreamSelf' }
    }
  } catch {}
  return { title: 'StreamSelf' }
}

async function TitleContent({
  type, id, season, episode,
}: {
  type: 'movie' | 'series'
  id: string
  season: number
  episode: number
}) {
  const tmdbId = parseInt(id, 10)
  if (Number.isNaN(tmdbId)) notFound()

  const user = await getSession()
  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value || null

  return (
    <PlayerPage
      type={type}
      tmdbId={tmdbId}
      playerUrl=""
      initialSeason={season}
      initialEpisode={episode}
      userId={user?.id || null}
      profileId={profileId}
    />
  )
}

export default async function TitlePage({ params, searchParams }: TitlePageProps) {
  const { type, id } = await params
  const search = await searchParams

  if (type !== 'movie' && type !== 'series') notFound()

  const season = parseInt(search.season || '1', 10)
  const episode = parseInt(search.episode || '1', 10)

  return (
    <Suspense fallback={<Loading />}>
      <TitleContent
        type={type}
        id={id}
        season={Number.isFinite(season) ? season : 1}
        episode={Number.isFinite(episode) ? episode : 1}
      />
    </Suspense>
  )
}
