export interface ContentRequest {
  id: string
  user_id: string
  title: string
  content_type: 'movie' | 'series'
  description: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  user?: {
    username: string
    avatar: string | null
  }
}

export interface Favorite {
  id: string
  user_id: string
  tmdb_id: number
  content_type: 'movie' | 'series'
  title: string
  poster: string | null
  created_at: string
}

export interface WatchHistory {
  id: string
  user_id: string
  tmdb_id: number
  content_type: 'movie' | 'series'
  title: string
  poster: string | null
  season: number | null
  episode: number | null
  progress: number
  watched_at: string
}

export interface SiteSetting {
  id: string
  key: string
  value: string | null
  updated_at: string
}
