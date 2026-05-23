import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FASTFLUX_API_KEY = 'ff_fbfa8fb608bf3e55bcdc25c2b671cce6ff0528431c96bdd24a64eb32343d8690'
const FASTFLUX_BASE = 'https://fastflux.xyz/api/v1/index.php'
const PROXY_PREFIX = 'https://atstream.online/api/stream?url='

// Récupère le lien MP4 direct depuis le player FastFlux
async function fetchMp4Url(playerUrl: string): Promise<string | null> {
  try {
    const res = await fetch(playerUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null
    const html = await res.text()
    // Cherche un lien .mp4 dans la page
    const match = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i)
    if (match) return PROXY_PREFIX + match[0]
    // Fallback: cherche "file":"..." ou "src":"..."
    const jsonMatch = html.match(/"(?:file|src|url)"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/i)
    if (jsonMatch) return PROXY_PREFIX + jsonMatch[1]
    return null
  } catch {
    return null
  }
}

// POST /api/auth/admin/fastflux — importer les liens
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const results = {
    movies: { updated: 0, skipped: 0, errors: 0 },
    series: { updated: 0, skipped: 0, errors: 0 },
    episodes: { updated: 0, skipped: 0, errors: 0 },
  }

  try {
    // ── FILMS ──
    const moviesRes = await fetch(`${FASTFLUX_BASE}?route=movies&api_key=${FASTFLUX_API_KEY}`)
    if (moviesRes.ok) {
      const moviesData = await moviesRes.json()
      const ffMovies: any[] = Array.isArray(moviesData) ? moviesData : (moviesData.results || moviesData.movies || [])

      for (const ffMovie of ffMovies) {
        try {
          const tmdbId = ffMovie.tmdb_id || ffMovie.id
          if (!tmdbId) continue

          // Chercher le film en base
          const { data: dbMovie } = await supabase
            .from('movies')
            .select('id, tmdb_id, video_url')
            .eq('tmdb_id', tmdbId)
            .single()

          if (!dbMovie) { results.movies.skipped++; continue }
          if (dbMovie.video_url) { results.movies.skipped++; continue }

          // Récupérer le MP4 depuis FastFlux
          const playerUrl = `${FASTFLUX_BASE}?route=movies/${tmdbId}/player&api_key=${FASTFLUX_API_KEY}`
          const videoUrl = await fetchMp4Url(playerUrl)

          if (!videoUrl) { results.movies.errors++; continue }

          await supabase
            .from('movies')
            .update({ video_url: videoUrl, updated_at: new Date().toISOString() })
            .eq('tmdb_id', tmdbId)

          results.movies.updated++
        } catch {
          results.movies.errors++
        }
      }
    }

    // ── SÉRIES / ÉPISODES ──
    const seriesRes = await fetch(`${FASTFLUX_BASE}?route=series&api_key=${FASTFLUX_API_KEY}`)
    if (seriesRes.ok) {
      const seriesData = await seriesRes.json()
      const ffSeries: any[] = Array.isArray(seriesData) ? seriesData : (seriesData.results || seriesData.series || [])

      for (const ffShow of ffSeries) {
        try {
          const tmdbId = ffShow.tmdb_id || ffShow.id
          if (!tmdbId) continue

          // Chercher la série en base
          const { data: dbSeries } = await supabase
            .from('series')
            .select('id, tmdb_id')
            .eq('tmdb_id', tmdbId)
            .single()

          if (!dbSeries) { results.series.skipped++; continue }
          results.series.updated++

          // Récupérer les épisodes sans lien
          const { data: episodes } = await supabase
            .from('episodes')
            .select('id, season_number, episode_number, video_url')
            .eq('series_id', dbSeries.id)
            .is('video_url', null)

          if (!episodes || episodes.length === 0) continue

          for (const ep of episodes) {
            try {
              const playerUrl = `${FASTFLUX_BASE}?route=series/${tmdbId}/player&season=${ep.season_number}&episode=${ep.episode_number}&api_key=${FASTFLUX_API_KEY}`
              const videoUrl = await fetchMp4Url(playerUrl)

              if (!videoUrl) { results.episodes.skipped++; continue }

              await supabase
                .from('episodes')
                .update({ video_url: videoUrl })
                .eq('id', ep.id)

              results.episodes.updated++
            } catch {
              results.episodes.errors++
            }
          }
        } catch {
          results.series.errors++
        }
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/auth/admin/fastflux — supprime tous les liens ajoutés par FastFlux
export async function DELETE() {
  const supabase = await createClient()

  try {
    // Supprimer les liens MP4 avec le préfixe atstream (ajoutés par FastFlux)
    const { error: moviesError } = await supabase
      .from('movies')
      .update({ video_url: null, updated_at: new Date().toISOString() })
      .like('video_url', `${PROXY_PREFIX}%`)

    const { error: episodesError } = await supabase
      .from('episodes')
      .update({ video_url: null })
      .like('video_url', `${PROXY_PREFIX}%`)

    if (moviesError) throw moviesError
    if (episodesError) throw episodesError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/auth/admin/fastflux — statistiques
export async function GET() {
  const supabase = await createClient()

  try {
    const [
      { count: totalMovies },
      { count: moviesWithUrl },
      { count: totalEpisodes },
      { count: episodesWithUrl },
      { count: fastfluxMovies },
      { count: fastfluxEpisodes },
    ] = await Promise.all([
      supabase.from('movies').select('*', { count: 'exact', head: true }),
      supabase.from('movies').select('*', { count: 'exact', head: true }).not('video_url', 'is', null),
      supabase.from('episodes').select('*', { count: 'exact', head: true }),
      supabase.from('episodes').select('*', { count: 'exact', head: true }).not('video_url', 'is', null),
      supabase.from('movies').select('*', { count: 'exact', head: true }).like('video_url', `${PROXY_PREFIX}%`),
      supabase.from('episodes').select('*', { count: 'exact', head: true }).like('video_url', `${PROXY_PREFIX}%`),
    ])

    return NextResponse.json({
      movies: { total: totalMovies || 0, withUrl: moviesWithUrl || 0, fastflux: fastfluxMovies || 0 },
      episodes: { total: totalEpisodes || 0, withUrl: episodesWithUrl || 0, fastflux: fastfluxEpisodes || 0 },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
