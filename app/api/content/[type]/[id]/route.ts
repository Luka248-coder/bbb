import { NextRequest, NextResponse } from 'next/server'
import {
  getMovieDetails,
  getSeriesDetails,
  getMovieCredits,
  getSeriesCredits,
  getSimilarMovies,
  getSimilarSeries,
  getSeasonDetails,
  getContentLogo,
  getCollection,
} from '@/lib/tmdb'

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  const { type, id } = params
  const tmdbId = parseInt(id)

  if (!tmdbId || isNaN(tmdbId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const url = new URL(request.url)
  const season = parseInt(url.searchParams.get('season') || '1')

  try {
    if (type === 'movie' || type === 'films') {
      const [details, credits, similar, logo] = await Promise.all([
        getMovieDetails(tmdbId),
        getMovieCredits(tmdbId),
        getSimilarMovies(tmdbId),
        getContentLogo('movie', tmdbId),
      ])

      if (!details) {
        return NextResponse.json({ error: 'Film introuvable' }, { status: 404 })
      }

      // Fetch collection if needed
      let collection = null
      if (details.belongs_to_collection?.id) {
        collection = await getCollection(details.belongs_to_collection.id)
      }

      return NextResponse.json({ details, credits, similar, logo, collection })
    }

    if (type === 'series' || type === 'tv') {
      const [details, credits, similar, logo, seasonData] = await Promise.all([
        getSeriesDetails(tmdbId),
        getSeriesCredits(tmdbId),
        getSimilarSeries(tmdbId),
        getContentLogo('tv', tmdbId),
        getSeasonDetails(tmdbId, season),
      ])

      if (!details) {
        return NextResponse.json({ error: 'Série introuvable' }, { status: 404 })
      }

      return NextResponse.json({ details, credits, similar, logo, seasonData })
    }

    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  } catch (error) {
    console.error('[API Content] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
