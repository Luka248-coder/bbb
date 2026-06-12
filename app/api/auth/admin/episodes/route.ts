import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

// Importer une série + toutes ses saisons/épisodes depuis TMDB
export async function POST(request: NextRequest) {
  const { tmdbId } = await request.json()
  const supabase = await createClient()

  try {
    // 1. Récupérer les détails de la série depuis TMDB
    const seriesRes = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`
    )
    if (!seriesRes.ok) throw new Error('TMDB series not found')
    const seriesData = await seriesRes.json()

    // 2. Insérer/mettre à jour la série en base
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .upsert({
        tmdb_id: seriesData.id,
        name: seriesData.name,
        original_name: seriesData.original_name,
        overview: seriesData.overview,
        poster_path: seriesData.poster_path,
        backdrop_path: seriesData.backdrop_path,
        first_air_date: seriesData.first_air_date,
        vote_average: seriesData.vote_average,
        vote_count: seriesData.vote_count,
        genre_ids: seriesData.genres?.map((g: any) => g.id) || [],
        popularity: seriesData.popularity,
        number_of_seasons: seriesData.number_of_seasons,
        number_of_episodes: seriesData.number_of_episodes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tmdb_id' })
      .select()
      .single()

    if (seriesError) throw seriesError

    // 3. Pour chaque saison, récupérer les épisodes
    const seasons = seriesData.seasons?.filter((s: any) => s.season_number > 0) || []
    let totalEpisodes = 0

    for (const season of seasons) {
      const seasonRes = await fetch(
        `${TMDB_BASE_URL}/tv/${tmdbId}/season/${season.season_number}?api_key=${TMDB_API_KEY}&language=fr-FR`
      )
      if (!seasonRes.ok) continue
      const seasonData = await seasonRes.json()

      const episodes = seasonData.episodes || []

      // Insérer tous les épisodes de cette saison
      for (const ep of episodes) {
        await supabase
          .from('episodes')
          .upsert({
            series_id: series.id,
            tmdb_id: ep.id,
            season_number: ep.season_number,
            episode_number: ep.episode_number,
            title: ep.name,
            overview: ep.overview,
            still_path: ep.still_path,
            air_date: ep.air_date,
            video_url: null, // à remplir manuellement
          }, { onConflict: 'series_id,season_number,episode_number' })
      }

      totalEpisodes += episodes.length
    }

    return NextResponse.json({
      success: true,
      series,
      seasons: seasons.length,
      episodes: totalEpisodes,
    })
  } catch (err: any) {
    console.error('Import error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Récupérer les épisodes d'une série
export async function GET(request: NextRequest) {
  const seriesId = request.nextUrl.searchParams.get('seriesId')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('series_id', seriesId)
    .order('season_number')
    .order('episode_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Mettre à jour le lien vidéo d'un épisode
export async function PATCH(request: NextRequest) {
  const { episodeId, videoUrl, downloadUrl } = await request.json()
  const supabase = await createClient()

  const updatePayload: Record<string, any> = {}
  if (videoUrl !== undefined) updatePayload.video_url = videoUrl
  if (downloadUrl !== undefined) updatePayload.download_url = downloadUrl

  const { data, error } = await supabase
    .from('episodes')
    .update(updatePayload)
    .eq('id', episodeId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}