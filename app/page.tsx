export const dynamic = 'force-dynamic'
import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { getMovies, getSeries } from '@/lib/fastflux'
import { Hero } from '@/components/hero'
import { ContentRow } from '@/components/content-row'
import { Footer } from '@/components/footer'
import { HeroSkeleton, RowSkeleton } from '@/components/loading'
import { GenreExplorer } from '@/components/genre-explorer'
import { DiscordBanner } from '@/components/discord-banner'
import { ContinueWatching } from '@/components/continue-watching'
import { createClient } from '@/lib/supabase/server'

async function getHeroContent(movies: any[], series: any[]) {
  try {
    const supabase = await createClient()
    const { data: settings } = await supabase.from('site_settings').select('value').eq('key', 'hero_mode').single()
    if (settings?.value === 'manual') {
      const { data: items } = await supabase.from('hero_items').select('*').order('position').limit(5)
      if (items && items.length > 0) {
        // Reconstituer les objets Movie/Series depuis les données hero_items
        return items.map((item: any) => {
          if (item.type === 'movie') {
            return movies.find(m => m.tmdb_id === item.tmdb_id || m.id === item.tmdb_id)
              || { id: item.tmdb_id, tmdb_id: item.tmdb_id, title: item.title, poster_path: item.poster_path, backdrop_path: item.backdrop_path, genre_ids: [], popularity: 0, vote_average: 0 }
          } else {
            return series.find(s => s.tmdb_id === item.tmdb_id || s.id === item.tmdb_id)
              || { id: item.tmdb_id, tmdb_id: item.tmdb_id, name: item.title, poster_path: item.poster_path, backdrop_path: item.backdrop_path, genre_ids: [], popularity: 0, vote_average: 0 }
          }
        }).filter(Boolean)
      }
    }
  } catch {}
  // Mode auto : top 5 par popularité
  return [...movies, ...series]
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 5)
}

async function HomeContent() {
  const [movies, series] = await Promise.all([getMovies(), getSeries()])

  const heroContent = await getHeroContent(movies, series)

  // Filtre : garde uniquement les contenus dont le titre original est en alphabet latin
  // (exclut zh, ja, ko, hi, ar, ru, th, etc.)
  const NON_LATIN = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/
  const isLatinOrigin = (original: string) => !NON_LATIN.test(original || '')

  const topRatedMovies = [...movies]
    .filter(m => isLatinOrigin(m.original_title))
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 10)
  const topRatedSeries = [...series]
    .filter(s => isLatinOrigin(s.original_name))
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 10)
  const newMovies = [...movies].sort((a, b) => new Date(b.release_date || '').getTime() - new Date(a.release_date || '').getTime()).slice(0, 20)
  const newSeries = [...series].sort((a, b) => new Date(b.first_air_date || '').getTime() - new Date(a.first_air_date || '').getTime()).slice(0, 20)
  const popularMovies = [...movies].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 20)
  const popularSeries = [...series].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 20)

  return (
    <>
      <Hero content={heroContent} />
      <div className="relative z-10 h-28 -mt-28 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #12080a)' }} />
      <main className="relative z-10 pt-4">
        <ContinueWatching />
        <ContentRow title="Top 10 Films de la semaine" content={topRatedMovies} type="movie" showRank accentColor="#e53935" />
        <ContentRow title="Top 10 Séries de la semaine" content={topRatedSeries} type="series" showRank accentColor="#e53935" />
        <ContentRow title="Nouveautés Films" content={newMovies} type="movie" />
        <ContentRow title="Nouveautés Séries" content={newSeries} type="series" />
        <ContentRow title="Films populaires" content={popularMovies} type="movie" />
        <ContentRow title="Séries populaires" content={popularSeries} type="series" />
        <GenreExplorer movies={movies} series={series} />
        <DiscordBanner />
      </main>
    </>
  )
}

export default async function HomePage() {
  const user = await getSession()
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Suspense fallback={
        <>
          <HeroSkeleton />
          <main className="relative z-10 -mt-4 pt-10">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </main>
        </>
      }>
        <HomeContent />
      </Suspense>
      <Footer />
    </div>
  )
}
