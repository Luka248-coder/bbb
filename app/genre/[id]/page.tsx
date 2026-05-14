export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { GenrePage } from '@/components/genre-page'
import { getMovies, getSeries } from '@/lib/fastflux'
import { GENRES } from '@/lib/content-types'

interface GenrePageProps {
  params: Promise<{ id: string }>
}

export default async function GenreRoute({ params }: GenrePageProps) {
  const { id } = await params
  const genreId = parseInt(id)
  const genreName = GENRES[genreId]

  if (!genreName) notFound()

  const [movies, series] = await Promise.all([getMovies(), getSeries()])

  const filteredMovies = movies.filter(m => m.genre_ids?.includes(genreId))
  const filteredSeries = series.filter(s => s.genre_ids?.includes(genreId))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24">
        <GenrePage
          genreId={genreId}
          genreName={genreName}
          movies={filteredMovies}
          series={filteredSeries}
        />
      </div>
      <Footer />
    </div>
  )
}