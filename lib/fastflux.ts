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

    if (!res.ok) return null;

    const responseData = await res.json();
    let results: any[] = [];

    if (responseData?.data?.items?.movies?.items) results = responseData.data.items.movies.items;
    else if (responseData?.data?.items?.series?.items) results = responseData.data.items.series.items;
    else if (Array.isArray(responseData)) results = responseData;

    if (results.length === 0) return null;

    if (tmdbId) {
      const match = results.find(r => 
        String(r.tmdbId || r.tmdb_id || r.id) === String(tmdbId)
      );
      if (match?.id) return match.id;
    }

    return results[0]?.id || null;
  } catch (err) {
    console.error('[Purstream Search Error]', err);
    return null;
  }
}

// ─── Récupération URL Vidéo ─────────────────────────────────────────────────────
async function purstream_getMovieUrl(purstreamId: number): Promise<string | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) return null;

    const sheet = await res.json();

    if (sheet.urls?.length > 0) {
      console.log(`✅ URL trouvée (urls): ${sheet.urls[0].url.substring(0, 80)}...`);
      return sheet.urls[0].url;
    }
    if (sheet.rls?.length > 0) return sheet.rls[0].url;
    if (sheet.sources?.length > 0) return sheet.sources[0].url;

    return null;
  } catch (err) {
    console.error('[purstream_getMovieUrl]', err);
    return null;
  }
}

async function purstream_getEpisodeUrl(purstreamId: number, season: number, episode: number): Promise<string | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) return null;

    const sheet = await res.json();

    if (sheet.urls?.length > 0) return sheet.urls[0].url;
    if (sheet.rls?.length > 0) return sheet.rls[0].url;
    if (sheet.sources?.length > 0) return sheet.sources[0].url;

    return null;
  } catch {
    return null;
  }
}

// ─── Fonctions Publiques ──────────────────────────────────────────────────────
export async function getMovies(): Promise<Movie[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('movies').select('*').order('popularity', { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

export async function getSeries(): Promise<Series[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('series').select('*').order('popularity', { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

export async function getMovieById(tmdbId: number): Promise<Movie | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('movies').select('*').eq('tmdb_id', tmdbId).single();
    return data || null;
  } catch {
    return null;
  }
}

export async function getSeriesById(tmdbId: number): Promise<Series | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('series').select('*').eq('tmdb_id', tmdbId).single();
    return data || null;
  } catch {
    return null;
  }
}

export async function getEpisodes(seriesId: number, seasonNumber?: number): Promise<Episode[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('episodes')
      .select('*')
      .eq('series_id', seriesId)
      .order('season_number')
      .order('episode_number');
    
    if (seasonNumber !== undefined) {
      query = query.eq('season_number', seasonNumber);
    }
    const { data } = await query;
    return data || [];
  } catch {
    return [];
  }
}

export async function searchContent(query: string): Promise<{ movies: Movie[], series: Series[] }> {
  try {
    const supabase = await createClient();
    const search = `%${query}%`;
    const [{ data: movies }, { data: series }] = await Promise.all([
      supabase.from('movies').select('*').ilike('title', search),
      supabase.from('series').select('*').ilike('name', search),
    ]);
    return { movies: movies || [], series: series || [] };
  } catch (error) {
    console.error('Error searching content:', error);
    return { movies: [], series: [] };
  }
}

export async function getMovieVideoUrl(tmdbId: number): Promise<string | null> {
  const movie = await getMovieById(tmdbId);
  if (movie?.video_url) return movie.video_url;

  const purstreamId = await purstream_searchId(movie?.title || '', 'movie', tmdbId);
  if (!purstreamId) return null;

  return purstream_getMovieUrl(purstreamId);
}

export async function getEpisodeVideoUrl(
  tmdbId: number,
  season: number,
  episode: number
): Promise<string | null> {
  const purstreamId = await purstream_searchId('', 'series', tmdbId);
  if (!purstreamId) return null;

  return purstream_getEpisodeUrl(purstreamId, season, episode);
}
