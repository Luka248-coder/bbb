import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AdminRecommendations } from '@/components/admin/admin-recommendations'
import { Loading } from '@/components/loading'

export const metadata = {
  title: 'Recommandations - Administration - StreamSelf',
}

async function RecommendationsContent() {
  const supabase = await createClient()
  const { data: movies } = await supabase.from('movies').select('tmdb_id')
  const { data: series } = await supabase.from('series').select('tmdb_id')

  const existingMovieIds = (movies || []).map(m => m.tmdb_id)
  const existingSeriesIds = (series || []).map(s => s.tmdb_id)

  return (
    <AdminRecommendations
      existingMovieIds={existingMovieIds}
      existingSeriesIds={existingSeriesIds}
    />
  )
}

export default function AdminRecommendationsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RecommendationsContent />
    </Suspense>
  )
}
