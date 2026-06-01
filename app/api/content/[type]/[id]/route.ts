import { NextRequest, NextResponse } from 'next/server'
import {
  getMovieDetails,
  getSeriesDetails,
  getMovieCredits,
  getSeriesCredits,
  getMovieVideos,
  getSeriesVideos,
  getSimilarMovies,
  getSimilarSeries,
  getSeasonDetails,
  getCollection,
  getContentLogo
} from '@/lib/tmdb'

import { getMovieVideoUrl, getEpisodeVideoUrl } from '@/lib/fastflux'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params
  const tmdbId = parseInt(id)
  const { searchParams } = new URL(request.url)

  const season = searchParams.get('season')
  const episode = searchParams.get('episode')
  const videoOnly = searchParams.get('video') === 'true'  // Pour demander seulement l'URL vidéo

  if (isNaN(tmdbId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  // ==================== MODE VIDÉO UNIQUEMENT ====================
  if (videoOnly) {
    try {
      let videoUrl: string | null = null

      if (type === 'movie') {
        videoUrl = await getMovieVideoUrl(tmdbId)
      } 
      else if (type === 'series' || type === 'tv') {
        if (season && episode) {
          const seasonNum = parseInt(season)
          const episodeNum = parseInt(episode)
          videoUrl = await getEpisodeVideoUrl(tmdbId, seasonNum, episodeNum)
        } else {
          // Si pas d'épisode spécifié, on retourne null (le player gérera)
          videoUrl = null
        }
      }

      if (!videoUrl) {
        return NextResponse.json(
          { error: 'Aucune source vidéo disponible' },
          { status: 404 }
        )
      }

      return NextResponse.json({ videoUrl })
    } catch (error) {
      console.error('[API Video Error]', error)
      return NextResponse.json({ error: 'Erreur lors de la récupération de la vidéo' }, { status: 500 })
    }
  }

  // ==================== MODE MÉTADONNÉES (comportement original) ====================
  try {
    if (type === 'movie') {
      const [details, credits, videos, similar, logo] = await Promise.all([
        getMovieDetails(tmdbId),
        getMovieCredits(tmdbId),
        getMovieVideos(tmdbId),
        getSimilarMovies(tmdbId),
        getContentLogo('movie', tmdbId)
      ])

      if (!details) {
        return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
      }

      const collection = details.belongs_to_collection
        ? await getCollection(details.belongs_to_collection.id)
        : null

      return NextResponse.json({
        details,
        credits,
        videos: videos.filter(v => v.site === 'YouTube'),
        similar: similar.slice(0, 12),
        collection,
        logo
      })
    } 
    else if (type === 'series' || type === 'tv') {
      const [details, credits, videos, similar, logo] = await Promise.all([
        getSeriesDetails(tmdbId),
        getSeriesCredits(tmdbId),
        getSeriesVideos(tmdbId),
        getSimilarSeries(tmdbId),
        getContentLogo('tv', tmdbId)
      ])

      if (!details) {
        return NextResponse.json({ error: 'Series not found' }, { status: 404 })
      }

      let seasonData = null
      if (season) {
        seasonData = await getSeasonDetails(tmdbId, parseInt(season))
      }

      return NextResponse.json({
        details,
        credits,
        videos: videos.filter(v => v.site === 'YouTube'),
        similar: similar.slice(0, 12),
        seasonData,
        logo
      })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching content details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
