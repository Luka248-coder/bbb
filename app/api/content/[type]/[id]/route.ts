import { NextRequest, NextResponse } from 'next/server'
import { getMovieVideoUrl, getEpisodeVideoUrl } from '@/lib/fastflux'

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  const { type, id } = params
  const tmdbId = parseInt(id)

  console.log(`[API Content] Requête reçue → Type: ${type} | ID: ${tmdbId}`)

  if (!tmdbId || isNaN(tmdbId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  try {
    let videoUrl: string | null = null

    if (type === 'movie' || type === 'films') {
      console.log(`[API Content] Mode FILM`)
      videoUrl = await getMovieVideoUrl(tmdbId)
    } 
    else if (type === 'series' || type === 'tv') {
      console.log(`[API Content] Mode SÉRIE/TV`)
      
      const url = new URL(request.url)
      const season = parseInt(url.searchParams.get('season') || '1')
      const episode = parseInt(url.searchParams.get('episode') || '1')

      console.log(`[API Content] Saison ${season} | Épisode ${episode}`)
      videoUrl = await getEpisodeVideoUrl(tmdbId, season, episode)
    } 
    else {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    if (videoUrl) {
      console.log(`[API Content] ✅ URL trouvée: ${videoUrl.substring(0, 100)}...`)
      return NextResponse.json({ 
        success: true, 
        url: videoUrl 
      })
    } else {
      console.log(`[API Content] ❌ Aucune URL trouvée`)
      return NextResponse.json({ 
        success: false,
        error: 'Aucune source disponible',
        message: 'Le contenu n\'est pas encore disponible sur nos serveurs.' 
      }, { status: 404 })
    }
  } catch (error) {
    console.error('[API Content] Erreur serveur:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
}
