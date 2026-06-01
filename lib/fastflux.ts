// SERVEUR UNIQUEMENT — ne pas importer dans des Client Components
import { createClient } from '@/lib/supabase/server'
import type { Movie, Series, Episode } from '@/lib/content-types'

export type { Movie, Series, Episode } from '@/lib/content-types'
export { GENRES, getGenreNames, getPosterUrl, getBackdropUrl } from '@/lib/content-types'

const PURSTREAM_BASE = 'https://api.purstream.ac/api/v1'

// ─── Recherche Purstream ────────────────────────────────────────────────────────
async function purstream_searchId(title: string, type: 'movie' | 'series', tmdbId?: number): Promise<number | null> {
  try {
    console.log(`[Purstream Search] "${title}" | Type: ${type} | TMDB: ${tmdbId}`);

    const res = await fetch(`${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`, {
      headers: { 
        Accept: 'application/json', 
        'User-Agent': 'Mozilla/5.0' 
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      console.log(`[Purstream Search] Erreur HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    let results: any[] = [];

    if (data?.data?.items?.movies?.items) results = data.data.items.movies.items;
    else if (data?.data?.items?.series?.items) results = data.data.items.series.items;
    else if (Array.isArray(data)) results = data;

    if (results.length === 0) return null;

    // Match par TMDB ID
    if (tmdbId) {
      const match = results.find(r => String(r.tmdbId || r.tmdb_id || r.id) === String(tmdbId));
      if (match?.id) {
        console.log(`[Purstream Search] ✅ Match TMDB ID: ${match.id}`);
        return match.id;
      }
    }

    return results[0]?.id || null;
  } catch (err) {
    console.error('[Purstream Search Error]', err);
    return null;
  }
}

// ─── Récupération URL (VERSION TRÈS VERBOSE) ─────────────────────
async function purstream_getMovieUrl(purstreamId: number): Promise<string | null> {
  try {
    console.log(`[Purstream Sheet] Fetching sheet for ID: ${purstreamId}`);

    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { 
        Accept: 'application/json', 
        'User-Agent': 'Mozilla/5.0' 
      },
    });

    if (!res.ok) {
      console.log(`[Purstream Sheet] Erreur HTTP: ${res.status}`);
      return null;
    }

    const sheet = await res.json();
    console.log(`[Purstream Sheet] Clés disponibles:`, Object.keys(sheet));

    let url: string | null = null;

    // Structure actuelle
    if (sheet.urls?.length > 0) {
      console.log(`[Purstream Sheet] "urls" trouvé (${sheet.urls.length} liens)`);
      const best = sheet.urls.find((s: any) => s.url?.includes('.m3u8'));
      url = best?.url || sheet.urls[0].url;
    }
    else if (sheet.rls?.length > 0) {
      url = sheet.rls[0].url;
    }
    else if (sheet.sources?.length > 0) {
      url = sheet.sources[0].url;
    }

    if (url) {
      console.log(`✅ [Purstream Sheet] URL trouvée : ${url.substring(0, 100)}...`);
    } else {
      console.log(`❌ [Purstream Sheet] Aucune URL trouvée dans le sheet`);
      console.log(`Sheet complet:`, JSON.stringify(sheet, null, 2).substring(0, 500));
    }

    return url;
  } catch (err) {
    console.error('[purstream_getMovieUrl Error]', err);
    return null;
  }
}

// ─── Fonctions Publiques ──────────────────────────────────────────────────────
export async function getMovieVideoUrl(tmdbId: number, titleFallback?: string): Promise<string | null> {
  console.log(`[getMovieVideoUrl] === DÉBUT === TMDB: ${tmdbId}`);

  const movie = await getMovieById(tmdbId);
  if (movie?.video_url) {
    console.log(`✅ URL trouvée en base de données`);
    return movie.video_url;
  }

  const title = titleFallback || movie?.title;
  if (!title) {
    console.log(`❌ Aucun titre disponible`);
    return null;
  }

  console.log(`[getMovieVideoUrl] Recherche Purstream pour: "${title}"`);
  const purstreamId = await purstream_searchId(title, 'movie', tmdbId);

  if (!purstreamId) {
    console.log(`❌ Aucun purstreamId trouvé`);
    return null;
  }

  console.log(`[getMovieVideoUrl] purstreamId trouvé: ${purstreamId}`);
  const videoUrl = await purstream_getMovieUrl(purstreamId);

  console.log(`[getMovieVideoUrl] === FIN === Résultat: ${videoUrl ? '✅ URL OK' : '❌ NULL'}`);
  return videoUrl;
}

// Les autres fonctions restent inchangées
export async function getMovies() { /* ... */ }
export async function getSeries() { /* ... */ }
export async function getMovieById(tmdbId: number): Promise<Movie | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('movies').select('*').eq('tmdb_id', tmdbId).single();
    return data || null;
  } catch {
    return null;
  }
}

export async function getSeriesById() { /* ... */ }
export async function getEpisodes() { /* ... */ }
export async function searchContent() { /* ... */ }
export async function getEpisodeVideoUrl() { /* ... */ }
