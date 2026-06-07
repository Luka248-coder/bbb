import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { PlayerPage } from '@/components/player-page'
import { NativePlayer } from '@/components/native-player'
import { Loading } from '@/components/loading'
import { PresenceTracker } from '@/components/presence-tracker'
import { getEpisodeVideoUrl, getMovieById, getSeriesById, getPosterUrl, getMovieVideoUrl } from '@/lib/fastflux'
import { getMovieDetails, getSeriesDetails } from '@/lib/tmdb'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

interface WatchPageProps {
  params: Promise<{ type: string; id: string }>
  searchParams: Promise<{ season?: string; episode?: string; play?: string; from?: string }>
}

async function saveVideoUrl(type: 'movie' | 'series', tmdbId: number, url: string, season?: number, episode?: number) {
  try {
    const supabase = await createClient()
    if (type === 'movie') {
      await supabase.from('movies').update({ video_url: url }).eq('tmdb_id', tmdbId)
    } else if (type === 'series' && season !== undefined && episode !== undefined) {
      // Chercher l'épisode en DB et sauvegarder l'URL
      const { data: series } = await supabase.from('series').select('id').eq('tmdb_id', tmdbId).single()
      if (series?.id) {
        await supabase.from('episodes')
          .update({ video_url: url })
          .eq('series_id', series.id)
          .eq('season_number', season)
          .eq('episode_number', episode)
      }
    }
  } catch (err) {
    console.error('[saveVideoUrl] Error:', err)
  }
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
    const movie = await getMovieById(tmdbId)
    title = movie?.title || 'Film'
    console.log('[Watch] Movie from DB:', movie?.tmdb_id, '| video_url:', movie?.video_url)

    if (movie?.video_url) {
      playerUrl = movie.video_url
    } else {
      let titleForPurstream = movie?.title || movie?.original_title
      if (!titleForPurstream) {
        const tmdbDetails = await getMovieDetails(tmdbId).catch(() => null)
        titleForPurstream = tmdbDetails?.title || tmdbDetails?.original_title || ''
        if (tmdbDetails?.title) title = tmdbDetails.title
      }
      console.log('[Watch] Calling Purstream for movie:', tmdbId, titleForPurstream)
      playerUrl = await getMovieVideoUrl(tmdbId, titleForPurstream || undefined)
      console.log('[Watch] Purstream result:', playerUrl)
      // Sauvegarder l'URL en DB pour éviter de re-chercher
      if (playerUrl) {
        await saveVideoUrl('movie', tmdbId, playerUrl)
        console.log('[Watch] ✅ URL saved to DB for movie', tmdbId)
      }
    }

    poster = movie?.poster_path ? getPosterUrl(movie.poster_path) : null

  } else {
    const series = await getSeriesById(tmdbId)
    seriesDbId = series?.id
    seriesName = series?.name || null
    title = `${series?.name || 'Série'} — S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`
    console.log('[Watch] Series from DB:', series?.tmdb_id, '| name:', series?.name)

    // Vérifier si l'épisode a déjà une URL en DB
    let episodeUrl: string | null = null
    if (series?.id) {
      const supabase = await createClient()
      const { data: ep } = await supabase
        .from('episodes')
        .select('video_url')
        .eq('series_id', series.id)
        .eq('season_number', season)
        .eq('episode_number', episode)
        .single()
      if (ep?.video_url) {
        episodeUrl = ep.video_url
        console.log('[Watch] ✅ Episode URL from DB:', episodeUrl?.substring(0, 60))
      }
    }

    if (episodeUrl) {
      playerUrl = episodeUrl
    } else {
      let titleForPurstream = series?.name || series?.original_name
      if (!titleForPurstream) {
        const tmdbDetails = await getSeriesDetails(tmdbId).catch(() => null)
        titleForPurstream = tmdbDetails?.name || tmdbDetails?.original_name || ''
        if (tmdbDetails?.name) {
          seriesName = tmdbDetails.name
          title = `${tmdbDetails.name} — S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`
        }
      }
      console.log('[Watch] Calling Purstream for series:', tmdbId, titleForPurstream, 'S'+season+'E'+episode)
      playerUrl = await getEpisodeVideoUrl(tmdbId, season, episode, titleForPurstream || undefined)
      console.log('[Watch] Purstream result:', playerUrl)
      // Sauvegarder l'URL en DB
      if (playerUrl) {
        await saveVideoUrl('series', tmdbId, playerUrl, season, episode)
        console.log('[Watch] ✅ URL saved to DB for episode S'+season+'E'+episode)
      }
    }

    poster = series?.poster_path ? getPosterUrl(series.poster_path) : null
  }

  const backUrl = '/'

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
    <>
      <PresenceTracker page={type === 'movie' ? 'watch_movie' : 'watch_series'} />
      <PlayerPage
        type={type}
        tmdbId={tmdbId}
        playerUrl={playerUrl || ''}
        initialSeason={season}
        initialEpisode={episode}
        userId={user?.id || null}
      />
    </>
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
