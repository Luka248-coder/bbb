import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AdminMovieManager } from '@/components/admin/admin-movie-manager'
import { Loading } from '@/components/loading'

export const metadata = {
  title: 'Films - Administration - StreamSelf',
}

async function MoviesContent() {
  const supabase = await createClient()
  const { data: movies } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false })

  return <AdminMovieManager items={movies || []} />
}

export default function AdminMoviesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MoviesContent />
    </Suspense>
  )
}