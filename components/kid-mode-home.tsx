'use client'

import { useProfile } from '@/contexts/ProfileContext'
import { Hero } from '@/components/hero'
import { ContentRow } from '@/components/content-row'
import { GenreExplorer } from '@/components/genre-explorer'
import { DiscordBanner } from '@/components/discord-banner'
import { ContinueWatching } from '@/components/continue-watching'
import { FeaturedBanner } from '@/components/featured-banner'

// Genres TMDB considérés safe pour enfants ≤9 ans
const KID_GENRES = [10751, 16] // Famille, Animation

function isKidSafe(item: any): boolean {
  if (item.adult === true) return false
  const genres: number[] = item.genre_ids || []
  return genres.some(g => KID_GENRES.includes(g))
}

interface Props {
  heroContent: any[]
  topRatedMovies: any[]
  topRatedSeries: any[]
  newMovies: any[]
  newSeries: any[]
  popularMovies: any[]
  popularSeries: any[]
  movies: any[]
  series: any[]
}

export function KidModeHome({
  heroContent,
  topRatedMovies,
  topRatedSeries,
  newMovies,
  newSeries,
  popularMovies,
  popularSeries,
  movies,
  series,
}: Props) {
  const { activeProfile } = useProfile()
  const isChild = activeProfile?.is_child === true

  const f = (arr: any[]) => isChild ? arr.filter(isKidSafe) : arr

  return (
    <>
      <Hero content={f(heroContent)} />
      <div className="relative z-10 h-28 -mt-28 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #12080a)' }} />
      <main className="relative z-10 pt-4">
        <ContinueWatching />
        <ContentRow title={isChild ? "🎬 Films pour toi" : "Top 10 Films de la semaine"} content={f(topRatedMovies)} type="movie" showRank={!isChild} accentColor="#e53935" />
        <ContentRow title={isChild ? "📺 Séries pour toi" : "Top 10 Séries de la semaine"} content={f(topRatedSeries)} type="series" showRank={!isChild} accentColor="#e53935" />
        <FeaturedBanner movies={f(movies)} series={f(series)} />
        <ContentRow title={isChild ? "✨ Nouveautés" : "Nouveautés Films"} content={f(newMovies)} type="movie" />
        {!isChild && <ContentRow title="Nouveautés Séries" content={newSeries} type="series" />}
        <ContentRow title={isChild ? "⭐ Les favoris des enfants" : "Films populaires"} content={f(popularMovies)} type="movie" />
        {!isChild && <ContentRow title="Séries populaires" content={popularSeries} type="series" />}
        <GenreExplorer movies={f(movies)} series={f(series)} />
        <DiscordBanner />
      </main>
    </>
  )
}
