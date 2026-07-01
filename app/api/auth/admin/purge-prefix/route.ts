import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prefix } = await request.json()

  if (!prefix || typeof prefix !== 'string' || prefix.length < 8) {
    return NextResponse.json({ error: 'Préfixe invalide (min 8 caractères)' }, { status: 400 })
  }

  // Sécurité : refuser les préfixes trop génériques qui videraient toute la DB
  const dangerous = ['http://', 'https://', 'http', 'https', '/']
  if (dangerous.includes(prefix.trim())) {
    return NextResponse.json({ error: 'Préfixe trop générique' }, { status: 400 })
  }

  const supabase = await createClient()
  const likePattern = `${prefix}%`

  // Compter d'abord pour le retour d'info
  const [countMovies, countEpisodes] = await Promise.all([
    supabase.from('movies').select('*', { count: 'exact', head: true }).like('video_url', likePattern),
    supabase.from('episodes').select('*', { count: 'exact', head: true }).like('video_url', likePattern),
  ])

  const totalMovies = countMovies.count ?? 0
  const totalEpisodes = countEpisodes.count ?? 0
  const total = totalMovies + totalEpisodes

  if (total === 0) {
    return NextResponse.json({ success: true, deleted: 0, message: 'Aucune URL trouvée avec ce préfixe.' })
  }

  // Purge : on met video_url à NULL (pas de suppression de ligne)
  const [resMovies, resEpisodes] = await Promise.all([
    supabase
      .from('movies')
      .update({ video_url: null, updated_at: new Date().toISOString() })
      .like('video_url', likePattern),
    supabase
      .from('episodes')
      .update({ video_url: null })
      .like('video_url', likePattern),
  ])

  if (resMovies.error || resEpisodes.error) {
    console.error('[purge-prefix] movies:', resMovies.error, 'episodes:', resEpisodes.error)
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
  }

  console.log(`[purge-prefix] prefix="${prefix}" → ${totalMovies} films + ${totalEpisodes} épisodes purgés`)

  return NextResponse.json({
    success: true,
    deleted: total,
    movies: totalMovies,
    episodes: totalEpisodes,
    message: `${total} URL${total > 1 ? 's' : ''} supprimée${total > 1 ? 's' : ''} (${totalMovies} film${totalMovies > 1 ? 's' : ''}, ${totalEpisodes} épisode${totalEpisodes > 1 ? 's' : ''})`,
  })
}
