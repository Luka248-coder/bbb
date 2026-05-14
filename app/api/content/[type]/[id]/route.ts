import { NextResponse } from 'next/server'
import { 
  getMovieDetails, 
  getSeriesDetails, 
  getMovieCredits, 
  getSeriesCredits,
  getMovieVideos,
  getSeriesVideos,
  getSimilarMovies,
  getSimilarSeries,
  getSeasonDetails
} from '@/lib/tmdb'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params
  const tmdbId = parseInt(id)
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season')

  if (isNaN(tmdbId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    if (type === 'movie') {
      const [details, credits, videos, similar] = await Promise.all([
        getMovieDetails(tmdbId),
        getMovieCredits(tmdbId),
        getMovieVideos(tmdbId),
        getSimilarMovies(tmdbId)
      ])

      if (!details) {
        return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
      }

      return NextResponse.json({
        details,
        credits,
        videos: videos.filter(v => v.site === 'YouTube'),
        similar: similar.slice(0, 12)
      })
    } else if (type === 'series') {
      const [details, credits, videos, similar] = await Promise.all([
        getSeriesDetails(tmdbId),
        getSeriesCredits(tmdbId),
        getSeriesVideos(tmdbId),
        getSimilarSeries(tmdbId)
      ])

      if (!details) {
        return NextResponse.json({ error: 'Series not found' }, { status: 404 })
      }

      // Get season details if requested
      let seasonData = null
      if (season) {
        seasonData = await getSeasonDetails(tmdbId, parseInt(season))
      }

      return NextResponse.json({
        details,
        credits,
        videos: videos.filter(v => v.site === 'YouTube'),
        similar: similar.slice(0, 12),
        seasonData
      })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching content details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
