// Types partagés entre client et serveur — pas d'import serveur ici

export interface Movie {
  id: number
  tmdb_id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  popularity: number
  adult: boolean
  video_url: string | null
}

export interface Series {
  id: number
  tmdb_id: number
  name: string
  original_name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  popularity: number
  number_of_seasons: number
  number_of_episodes: number
}

export interface Episode {
  id: number
  series_id: number
  tmdb_id: number | null
  season_number: number
  episode_number: number
  title: string | null
  overview: string | null
  still_path: string | null
  air_date: string | null
  video_url: string | null
}

export const GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Aventure',
  16: 'Animation',
  35: 'Comédie',
  80: 'Crime',
  99: 'Documentaire',
  18: 'Drame',
  10751: 'Famille',
  14: 'Fantastique',
  36: 'Histoire',
  27: 'Horreur',
  10402: 'Musique',
  9648: 'Mystère',
  10749: 'Romance',
  878: 'Science-Fiction',
  10770: 'Téléfilm',
  53: 'Thriller',
  10752: 'Guerre',
  37: 'Western',
  10759: 'Action & Aventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
}

export function getGenreNames(genreIds: number[]): string[] {
  return genreIds.map(id => GENRES[id]).filter(Boolean)
}

export function getPosterUrl(path: string | null): string {
  if (!path) return '/images/placeholder-poster.jpg'
  return `https://image.tmdb.org/t/p/w500${path}`
}

export function getBackdropUrl(path: string | null): string {
  if (!path) return '/images/placeholder-backdrop.jpg'
  return `https://image.tmdb.org/t/p/original${path}`
}