import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { NativePlayer } from '@/components/native-player'
import { Loading } from '@/components/loading'
import { PresenceTracker } from '@/components/presence-tracker'
import { getEpisodeVideoUrl, getMovieById, getSeriesById, getPosterUrl, getMovieVideoUrl } from '@/lib/fastflux'
import { isCinflixMediaUrl } from '@/lib/cinflix-url'
import { mediaUrlMatchesTmdb } from '@/lib/tmdb-media-url'
import { getMovieDetails, getSeriesDetails } from '@/lib/tmdb'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

interface WatchPageProps {
  params: Promise<{ type: string; id: string }>
  searchParams: Promise<{ season?: string; episode?: string; play?: string; from?: string }>
}

async function saveVideoUrl(type: 'movie' | 'series', tmdbId: number, url: string | null, season?: number, episode?: number) {
  try {
    const supabase = await createClient()
    if (type === 'movie') {
      await supabase.from('movies').update({ video_url: url || null }).eq('tmdb_id', tmdbId)
    } else if (type === 'series' && season !== undefined && episode !== undefined) {
      const { data: series } = await supabase.from('series').select('id').eq('tmdb_id', tmdbId).single()
      if (series?.id) {
        await supabase.from('episodes')
          .update({ video_url: url || null })
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
  type, id, season, episode,
}: {
  type: 'movie' | 'series'
  id: string
  season: number
  episode: number
}) {
  const tmdbId = parseInt(id)
  const user = await getSession()
  const cookieStore = await cookies()
  const profileId = cookieStore.get('active_profile_id')?.value || null

  let playerUrl: string | null = null
  let title = ''
  let seriesDbId: number | undefined
  let poster: string | null = null
  let seriesName: string | null = null
  let contentYear: number | undefined

  if (type === 'movie') {
    const movie = await getMovieById(tmdbId)
    title = movie?.title || 'Film'
    console.log('[Watch] Movie from DB:', movie?.tmdb_id, '| video_url:', movie?.video_url)

    if (movie?.video_url && mediaUrlMatchesTmdb(movie.video_url, tmdbId)) {
      playerUrl = movie.video_url
    } else {
      if (movie?.video_url) {
        console.warn('[Watch] Ignoring stored URL with TMDB mismatch for', tmdbId)
        await saveVideoUrl('movie', tmdbId, null)
      }
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
      if (playerUrl && !isCinflixMediaUrl(playerUrl) && mediaUrlMatchesTmdb(playerUrl, tmdbId)) {
        await saveVideoUrl('movie', tmdbId, playerUrl)
        console.log('[Watch] ✅ URL saved to DB for movie', tmdbId)
      }
    }

    poster = movie?.poster_path ? getPosterUrl(movie.poster_path) : null
    contentYear = movie?.release_date ? parseInt(movie.release_date.slice(0, 4)) : undefined

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
      if (ep?.video_url && mediaUrlMatchesTmdb(ep.video_url, tmdbId)) {
        episodeUrl = ep.video_url
        console.log('[Watch] ✅ Episode URL from DB:', episodeUrl?.substring(0, 60))
      } else if (ep?.video_url) {
        console.warn('[Watch] Ignoring stored episode URL with TMDB mismatch for', tmdbId)
        await saveVideoUrl('series', tmdbId, null, season, episode)
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
      if (playerUrl && !isCinflixMediaUrl(playerUrl) && mediaUrlMatchesTmdb(playerUrl, tmdbId)) {
        await saveVideoUrl('series', tmdbId, playerUrl, season, episode)
        console.log('[Watch] ✅ URL saved to DB for episode S'+season+'E'+episode)
      }
    }

    poster = series?.poster_path ? getPosterUrl(series.poster_path) : null
    contentYear = series?.first_air_date ? parseInt(series.first_air_date.slice(0, 4)) : undefined
  }

  const backUrl = `/title/${type}/${tmdbId}${type === 'series' ? `?season=${season}&episode=${episode}` : ''}`

  return (
    <>
      <PresenceTracker
        page={type === 'movie' ? 'watch_movie' : 'watch_series'}
        title={title}
        tmdbId={tmdbId}
        contentType={type as 'movie' | 'series'}
        poster={poster}
        season={type === 'series' ? season : undefined}
        episode={type === 'series' ? episode : undefined}
        userId={user?.id || null}
        username={user?.username || null}
      />
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
        profileId={profileId}
        poster={poster}
        seriesName={seriesName}
        year={contentYear}
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

  if (!play) {
    const qs = new URLSearchParams()
    if (type === 'series') {
      if (search.season) qs.set('season', search.season)
      if (search.episode) qs.set('episode', search.episode)
    }
    const q = qs.toString()
    redirect(`/title/${type}/${id}${q ? `?${q}` : ''}`)
  }

  return (
    <Suspense fallback={<Loading />}>
      <WatchContent type={type as 'movie'|'series'} id={id} season={season} episode={episode} />
    </Suspense>
  )
}
