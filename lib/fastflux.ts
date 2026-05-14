// SERVEUR UNIQUEMENT — ne pas importer dans des Client Components
import { createClient } from '@/lib/supabase/server'
import type { Movie, Series, Episode } from '@/lib/content-types'

export type { Movie, Series, Episode } from '@/lib/content-types'
export { GENRES, getGenreNames, getPosterUrl, getBackdropUrl } from '@/lib/content-types'

export async function getMovies(): Promise<Movie[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('popularity', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching movies:', error)
    return []
  }
}

export async function getSeries(): Promise<Series[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .order('popularity', { ascending: false })
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching series:', error)
    return []
  }
}

export async function getMovieById(tmdbId: number): Promise<Movie | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export async function getSeriesById(tmdbId: number): Promise<Series | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export async function getEpisodes(seriesId: number, seasonNumber?: number): Promise<Episode[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('episodes')
      .select('*')
      .eq('series_id', seriesId)
      .order('season_number')
      .order('episode_number')
    if (seasonNumber !== undefined) {
      query = query.eq('season_number', seasonNumber)
    }
    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching episodes:', error)
    return []
  }
}

export async function searchContent(query: string): Promise<{ movies: Movie[], series: Series[] }> {
  try {
    const supabase = await createClient()
    const search = `%${query}%`
    const [{ data: movies }, { data: series }] = await Promise.all([
      supabase.from('movies').select('*').ilike('title', search),
      supabase.from('series').select('*').ilike('name', search),
    ])
    return { movies: movies || [], series: series || [] }
  } catch (error) {
    console.error('Error searching content:', error)
    return { movies: [], series: [] }
  }
}

export async function getMovieVideoUrl(tmdbId: number): Promise<string | null> {
  const movie = await getMovieById(tmdbId)
  return movie?.video_url || null
}

export async function getEpisodeVideoUrl(tmdbId: number, season: number, episode: number): Promise<string | null> {
  try {
    const series = await getSeriesById(tmdbId)
    if (!series) return null
    const supabase = await createClient()
    const { data } = await supabase
      .from('episodes')
      .select('video_url')
      .eq('series_id', series.id)
      .eq('season_number', season)
      .eq('episode_number', episode)
      .single()
    return data?.video_url || null
  } catch {
    return null
  }
}