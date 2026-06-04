export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getSeries } from '@/lib/fastflux'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ContentGrid } from '@/components/content-grid'
import { ContentRow } from '@/components/content-row'
import { Loading } from '@/components/loading'

export const metadata = {
  title: 'Séries - StreamSelf',
}

async function SeriesContent() {
  const series = await getSeries()

  const topRatedSeries = [...series]
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 10)

  return (
    <>
      <ContentRow
        title="Top 10 Séries de la semaine"
        content={topRatedSeries}
        type="series"
        showRank
      />
      <ContentGrid title="Séries" content={series} type="series" />
    </>
  )
}

export default function SeriesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <Suspense fallback={<Loading />}>
          <SeriesContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}