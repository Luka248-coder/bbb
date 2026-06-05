export const dynamic = 'force-dynamic'
import { Suspense } from 'react'
import { getMovies } from '@/lib/fastflux'
import { Footer } from '@/components/footer'
import { ContentGrid } from '@/components/content-grid'
import { Loading } from '@/components/loading'

export const metadata = {
  title: 'Films - StreamSelf',
}

async function MoviesContent() {
  const movies = await getMovies()
  return <ContentGrid title="Films" content={movies} type="movie" />
}

export default function MoviesPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24">
        <Suspense fallback={<Loading />}>
          <MoviesContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
