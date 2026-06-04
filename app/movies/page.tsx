export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getMovies } from '@/lib/fastflux'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ContentGrid } from '@/components/content-grid'
import { ContentRow } from '@/components/content-row'
import { Loading } from '@/components/loading'

export const metadata = {
  title: 'Films - StreamSelf',
}

async function MoviesContent() {
  const movies = await getMovies()

  const topRatedMovies = [...movies]
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 10)

  return (
    <>
      <ContentRow
        title="Top 10 Films de la semaine"
        content={topRatedMovies}
        type="movie"
        showRank
      />
      <ContentGrid title="Films" content={movies} type="movie" />
    </>
  )
}

export default function MoviesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <Suspense fallback={<Loading />}>
          <MoviesContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}