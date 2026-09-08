export const dynamic = 'force-dynamic'
import { Suspense } from 'react'
import { getSeries } from '@/lib/fastflux'
import { ContentGrid } from '@/components/content-grid'
import { Loading } from '@/components/loading'

export const metadata = {
  title: 'Séries - StreamSelf',
}

async function SeriesContent() {
  const series = await getSeries()
  return <ContentGrid title="Séries" content={series} type="series" />
}

export default function SeriesPage() {
  return (
    <div className="min-h-screen bg-[#08080a]">
      <Suspense fallback={<Loading />}>
        <SeriesContent />
      </Suspense>
    </div>
  )
}
