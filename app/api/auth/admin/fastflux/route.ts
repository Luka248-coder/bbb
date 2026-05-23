import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FASTFLUX_API_KEY = 'ff_fbfa8fb608bf3e55bcdc25c2b671cce6ff0528431c96bdd24a64eb32343d8690'
const FASTFLUX_BASE = 'https://fastflux.xyz/api/v1/index.php'
const PROXY_PREFIX = 'https://atstream.online/api/stream?url='

// POST /api/auth/admin/fastflux?debug=1 — voir la structure brute de l'API
// POST /api/auth/admin/fastflux — importer les liens
export async function POST(request: NextRequest) {
  const debug = request.nextUrl.searchParams.get('debug') === '1'
  const supabase = await createClient()

  // ── MODE DEBUG : retourne la structure brute ──
  if (debug) {
    const [moviesRaw, seriesRaw] = await Promise.all([
      fetch(`${FASTFLUX_BASE}?route=movies&api_key=${FASTFLUX_API_KEY}`).then(r => r.json()).catch(e => ({ error: e.message })),
      fetch(`${FASTFLUX_BASE}?route=series&api_key=${FASTFLUX_API_KEY}`).then(r => r.json()).catch(e => ({ error: e.message })),
    ])

    // Premier film pour voir la structure
    const firstMovie = Array.isArray(moviesRaw) ? moviesRaw[0] : (moviesRaw?.results?.[0] || moviesRaw?.movies?.[0] || moviesRaw?.data?.[0] || Object.values(moviesRaw)[0])
    const firstSeries = Array.isArray(seriesRaw) ? seriesRaw[0] : (seriesRaw?.results?.[0] || seriesRaw?.series?.[0] || seriesRaw?.data?.[0] || Object.values(seriesRaw)[0])

    // Si un tmdb_id est dispo, tester aussi le player
    let playerSample = null
    const sampleId = firstMovie?.tmdb_id || firstMovie?.id
    if (sampleId) {
      const playerUrl = `${FASTFLUX_BASE}?route=movies/${sampleId}/player&api_key=${FASTFLUX_API_KEY}`
      playerSample = await fetch(playerUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(r => r.text()).catch(e => `ERROR: ${e.message}`)
    }

    return NextResponse.json({
      movies_top_level_keys: Array.isArray(moviesRaw) ? `array[${moviesRaw.length}]` : Object.keys(moviesRaw),
      series_top_level_keys: Array.isArray(seriesRaw) ? `array[${seriesRaw.length}]` : Object.keys(seriesRaw),
      first_movie_keys: firstMovie ? Object.keys(firstMovie) : null,
      first_movie_sample: firstMovie,
      first_series_keys: firstSeries ? Object.keys(firstSeries) : null,
      first_series_sample: firstSeries,
      player_html_sample: playerSample ? playerSample.slice(0, 2000) : null,
    })
  }

  // ── IMPORT NORMAL ──
  const results = {
    movies: { updated: 0, skipped: 0, errors: 0 },
    series: { updated: 0, skipped: 0, errors: 0 },
    episodes: { updated: 0, skipped: 0, errors: 0 },
    debug_info: { movie_keys: [] as string[], series_keys: [] as string[], mp4_field_found: '' },
  }

  try {
    // ── FILMS ──
    const moviesRes = await fetch(`${FASTFLUX_BASE}?route=movies&api_key=${FASTFLUX_API_KEY}`)
    if (moviesRes.ok) {
      const moviesData = await moviesRes.json()
      const ffMovies: any[] = Array.isArray(moviesData)
        ? moviesData
        : (moviesData.results || moviesData.movies || moviesData.data || Object.values(moviesData).find(v => Array.isArray(v)) || [])

      if (ffMovies.length > 0) {
        results.debug_info.movie_keys = Object.keys(ffMovies[0])
      }

      for (const ffMovie of ffMovies) {
        try {
          const tmdbId = ffMovie.tmdb_id || ffMovie.tmdb || ffMovie.id
          if (!tmdbId) continue

          const { data: dbMovie } = await supabase
            .from('movies')
            .select('id, tmdb_id, video_url')
            .eq('tmdb_id', tmdbId)
            .single()

          if (!dbMovie || dbMovie.video_url) { results.movies.skipped++; continue }

          // Cherche le MP4 directement dans les champs du film
          let videoUrl: string | null =
            ffMovie.stream_url || ffMovie.mp4 || ffMovie.video_url || ffMovie.url ||
            ffMovie.file || ffMovie.link || ffMovie.stream || ffMovie.source || null

          // Si le lien est dans le player HTML
          if (!videoUrl) {
            const playerUrl = `${FASTFLUX_BASE}?route=movies/${tmdbId}/player&api_key=${FASTFLUX_API_KEY}`
            const playerRes = await fetch(playerUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            if (playerRes.ok) {
              const html = await playerRes.text()
              // Tente JSON embarqué
              const jsonMatch = html.match(/"(?:file|src|url|stream|mp4|source)"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/i)
              if (jsonMatch) videoUrl = jsonMatch[1]
              else {
                // Tente URL brute
                const urlMatch = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i)
                if (urlMatch) videoUrl = urlMatch[0]
              }
              if (videoUrl) results.debug_info.mp4_field_found = 'player_html'
            }
          } else {
            results.debug_info.mp4_field_found = 'direct_field'
          }

          if (!videoUrl) { results.movies.errors++; continue }

          // Préfixer si pas déjà fait
          const finalUrl = videoUrl.startsWith(PROXY_PREFIX) ? videoUrl : PROXY_PREFIX + videoUrl

          await supabase
            .from('movies')
            .update({ video_url: finalUrl, updated_at: new Date().toISOString() })
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
      const ffSeries: any[] = Array.isArray(seriesData)
        ? seriesData
        : (seriesData.results || seriesData.series || seriesData.data || Object.values(seriesData).find((v: any) => Array.isArray(v)) || [])

      if (ffSeries.length > 0) {
        results.debug_info.series_keys = Object.keys(ffSeries[0])
      }

      for (const ffShow of ffSeries) {
        try {
          const tmdbId = ffShow.tmdb_id || ffShow.tmdb || ffShow.id
          if (!tmdbId) continue

          const { data: dbSeries } = await supabase
            .from('series')
            .select('id, tmdb_id')
            .eq('tmdb_id', tmdbId)
            .single()

          if (!dbSeries) { results.series.skipped++; continue }
          results.series.updated++

          // Épisodes sans lien
          const { data: episodes } = await supabase
            .from('episodes')
            .select('id, season_number, episode_number, video_url')
            .eq('series_id', dbSeries.id)
            .is('video_url', null)

          if (!episodes || episodes.length === 0) continue

          for (const ep of episodes) {
            try {
              const playerUrl = `${FASTFLUX_BASE}?route=series/${tmdbId}/player&season=${ep.season_number}&episode=${ep.episode_number}&api_key=${FASTFLUX_API_KEY}`
              const playerRes = await fetch(playerUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
              if (!playerRes.ok) { results.episodes.skipped++; continue }

              const html = await playerRes.text()
              let videoUrl: string | null = null

              const jsonMatch = html.match(/"(?:file|src|url|stream|mp4|source)"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/i)
              if (jsonMatch) videoUrl = jsonMatch[1]
              else {
                const urlMatch = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i)
                if (urlMatch) videoUrl = urlMatch[0]
              }

              if (!videoUrl) { results.episodes.skipped++; continue }

              const finalUrl = videoUrl.startsWith(PROXY_PREFIX) ? videoUrl : PROXY_PREFIX + videoUrl

              await supabase
                .from('episodes')
                .update({ video_url: finalUrl })
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

// DELETE — supprime tous les liens FastFlux
export async function DELETE() {
  const supabase = await createClient()
  try {
    await supabase.from('movies').update({ video_url: null, updated_at: new Date().toISOString() }).like('video_url', `${PROXY_PREFIX}%`)
    await supabase.from('episodes').update({ video_url: null }).like('video_url', `${PROXY_PREFIX}%`)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — statistiques
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
