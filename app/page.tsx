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

async function HomeContent() {
  const [movies, series] = await Promise.all([
    getMovies(),
    getSeries(),
  ])
  const allContent = [...movies, ...series]
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  const topRatedMovies = [...movies]
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 10)
  const topRatedSeries = [...series]
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 10)
  const newMovies = [...movies]
    .sort((a, b) => new Date(b.release_date || '').getTime() - new Date(a.release_date || '').getTime())
    .slice(0, 20)
  const newSeries = [...series]
    .sort((a, b) => new Date(b.first_air_date || '').getTime() - new Date(a.first_air_date || '').getTime())
    .slice(0, 20)
  const popularMovies = [...movies]
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 20)
  const popularSeries = [...series]
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 20)
  return (
    <>
      <Hero content={allContent.slice(0, 5)} />
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
