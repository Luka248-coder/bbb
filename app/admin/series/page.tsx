import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AdminSeriesManager } from '@/components/admin/admin-series-manager'
import { Loading } from '@/components/loading'

export const metadata = {
  title: 'Séries - Administration - Cinemafrance',
}

async function SeriesContent() {
  const supabase = await createClient()
  const { data: series } = await supabase
    .from('series')
    .select('*')
    .order('popularity', { ascending: false })

  return <AdminSeriesManager items={series || []} />
}

export default function AdminSeriesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SeriesContent />
    </Suspense>
  )
}