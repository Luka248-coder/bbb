const TMDB_API_KEY = process.env.TMDB_API_KEY || '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export interface TMDBMovieDetails {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  runtime: number
  genres: { id: number; name: string }[]
  production_companies: { id: number; name: string; logo_path: string | null }[]
  production_countries: { iso_3166_1: string; name: string }[]
  spoken_languages: { iso_639_1: string; name: string }[]
  budget: number
  revenue: number
  tagline: string
  status: string
  adult: boolean
  original_language: string
  belongs_to_collection: { id: number; name: string; poster_path: string | null; backdrop_path: string | null } | null
}

export interface TMDBSeriesDetails {
  id: number
  name: string
  original_name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  last_air_date: string
  vote_average: number
  vote_count: number
  number_of_seasons: number
  number_of_episodes: number
  episode_run_time: number[]
  genres: { id: number; name: string }[]
  networks: { id: number; name: string; logo_path: string | null }[]
  production_companies: { id: number; name: string; logo_path: string | null }[]
  seasons: TMDBSeason[]
  status: string
  tagline: string
  type: string
}

export interface TMDBSeason {
  id: number
  name: string
  overview: string
  poster_path: string | null
  season_number: number
  episode_count: number
  air_date: string
}

export interface TMDBEpisode {
  id: number
  name: string
  overview: string
  still_path: string | null
  episode_number: number
  season_number: number
  air_date: string
  vote_average: number
  runtime: number
}

export interface TMDBCredits {
  cast: TMDBCastMember[]
  crew: TMDBCrewMember[]
}

export interface TMDBCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface TMDBCrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
}

export interface TMDBVideo {
  id: string
  key: string
  name: string
  site: string
  type: string
  official: boolean
}

// Get movie details
export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )
    
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Error fetching movie details:', error)
    return null
  }
}

// Get series details
export async function getSeriesDetails(tmdbId: number): Promise<TMDBSeriesDetails | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } }
    )
    
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Error fetching series details:', error)
    return null
  }
}

// Get movie credits (cast & crew)
export async function getMovieCredits(tmdbId: number): Promise<TMDBCredits | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } }
    )
    
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Error fetching movie credits:', error)
    return null
  }
}

// Get series credits
export async function getSeriesCredits(tmdbId: number): Promise<TMDBCredits | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/credits?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } }
    )
    
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Error fetching series credits:', error)
    return null
  }
}

// Get season details with episodes
export async function getSeasonDetails(tmdbId: number, seasonNumber: number): Promise<{
  episodes: TMDBEpisode[]
  name: string
  overview: string
  poster_path: string | null
} | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } }
    )
    
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Error fetching season details:', error)
    return null
  }
}

// Get movie videos (trailers, teasers)
export async function getMovieVideos(tmdbId: number): Promise<TMDBVideo[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } }
    )
    
    if (!response.ok) return []
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error fetching movie videos:', error)
    return []
  }
}

// Get series videos
export async function getSeriesVideos(tmdbId: number): Promise<TMDBVideo[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } }
    )
    
    if (!response.ok) return []
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error fetching series videos:', error)
    return []
  }
}

// Get similar movies
export async function getSimilarMovies(tmdbId: number): Promise<TMDBMovieDetails[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}/similar?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`,
      { next: { revalidate: 3600 } }
    )
    
    if (!response.ok) return []
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error fetching similar movies:', error)
    return []
  }
}

// Get similar series
export async function getSimilarSeries(tmdbId: number): Promise<TMDBSeriesDetails[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/similar?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`,
      { next: { revalidate: 3600 } }
    )
    
    if (!response.ok) return []
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error fetching similar series:', error)
    return []
  }
}

// Get trending content
export async function getTrendingMovies(): Promise<TMDBMovieDetails[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    )
    
    if (!response.ok) return []
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error fetching trending movies:', error)
    return []
  }
}

export async function getTrendingSeries(): Promise<TMDBSeriesDetails[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 1800 } }
    )
    
    if (!response.ok) return []
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error fetching trending series:', error)
    return []
  }
}

// Get upcoming movies
export async function getUpcomingMovies(): Promise<TMDBMovieDetails[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&language=fr-FR&region=FR`,
      { next: { revalidate: 1800 } }
    )
    
    if (!response.ok) return []
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error fetching upcoming movies:', error)
    return []
  }
}

// Image URL helpers
export function getTMDBPosterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
  if (!path) return '/images/placeholder-poster.jpg'
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function getTMDBBackdropUrl(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'original'): string {
  if (!path) return '/images/placeholder-backdrop.jpg'
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function getTMDBProfileUrl(path: string | null, size: 'w45' | 'w185' | 'h632' | 'original' = 'w185'): string {
  if (!path) return '/images/placeholder-profile.jpg'
  return `https://image.tmdb.org/t/p/${size}${path}`
}

// Get directors from credits
export function getDirectors(credits: TMDBCredits | null): TMDBCrewMember[] {
  if (!credits) return []
  return credits.crew.filter(member => member.job === 'Director')
}

// Get writers from credits  
export function getWriters(credits: TMDBCredits | null): TMDBCrewMember[] {
  if (!credits) return []
  return credits.crew.filter(member => 
    member.job === 'Writer' || 
    member.job === 'Screenplay' || 
    member.job === 'Story'
  )
}

// Format runtime
export function formatRuntime(minutes: number): string {
  if (!minutes) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

// Format date
export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

// Format year
export function formatYear(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).getFullYear().toString()
}

// Get collection details (saga)
export async function getCollection(collectionId: number): Promise<{
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  parts: { id: number; title: string; poster_path: string | null; release_date: string; vote_average: number }[]
} | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/collection/${collectionId}?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } }
    )
    if (!response.ok) return null
    const data = await response.json()
    // Sort by release date
    data.parts = (data.parts || []).sort((a: any, b: any) =>
      new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
    )
    return data
  } catch (error) {
    console.error('Error fetching collection:', error)
    return null
  }
}
