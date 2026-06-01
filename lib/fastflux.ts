// SERVEUR UNIQUEMENT — ne pas importer dans des Client Components
import { createClient } from '@/lib/supabase/server'
import type { Movie, Series, Episode } from '@/lib/content-types'

export type { Movie, Series, Episode } from '@/lib/content-types'
export { GENRES, getGenreNames, getPosterUrl, getBackdropUrl } from '@/lib/content-types'

const PURSTREAM_BASE = 'https://api.purstream.ac/api/v1'

// ─── Recherche Purstream ────────────────────────────────────────────────────────
async function purstream_searchId(title: string, type: 'movie' | 'series', tmdbId?: number): Promise<number | null> {
  // Essai 1 : endpoint direct par tmdbId (pas de recherche nécessaire)
  if (tmdbId) {
    const endpoints = [
      `${PURSTREAM_BASE}/media/tmdb/${tmdbId}`,
      `${PURSTREAM_BASE}/media/tmdb/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}`,
      `${PURSTREAM_BASE}/content/tmdb/${tmdbId}`,
    ];
    for (const url of endpoints) {
      try {
        const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          const id = d?.data?.items?.id || d?.data?.id || d?.id;
          if (id) { console.log(`[Purstream] ✅ tmdbId lookup: ${url} → id ${id}`); return id; }
        }
      } catch {}
    }
  }

  // Essai 2 : recherche par titre avec plusieurs endpoints
  const searchEndpoints = [
    `${PURSTREAM_BASE}/search/${encodeURIComponent(title)}`,
    `${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`,
    `${PURSTREAM_BASE}/media/search?q=${encodeURIComponent(title)}`,
    `${PURSTREAM_BASE}/content/search?title=${encodeURIComponent(title)}`,
  ];

  for (const url of searchEndpoints) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
      console.log(`[Purstream Search] ${url} → ${r.status}`);
      if (!r.ok) continue;

      const d = await r.json();
      let results: any[] = [];
      if (d?.data?.items?.movies?.items) results = [...d.data.items.movies.items, ...(d.data.items.series?.items || [])];
      else if (d?.data?.items?.series?.items) results = d.data.items.series.items;
      else if (d?.data?.items) results = Array.isArray(d.data.items) ? d.data.items : [];
      else if (Array.isArray(d)) results = d;
      else if (d?.results) results = d.results;

      if (results.length === 0) continue;

      if (tmdbId) {
        const match = results.find((r: any) => String(r.tmdbId || r.tmdb_id) === String(tmdbId));
        if (match?.id) { console.log(`[Purstream] ✅ search match: ${match.id}`); return match.id; }
      }
      if (results[0]?.id) { console.log(`[Purstream] ✅ first result: ${results[0].id}`); return results[0].id; }
    } catch (err) {
      console.error(`[Purstream Search Error] ${url}:`, err);
    }
  }

  console.error(`[Purstream] ❌ Not found: "${title}" tmdbId=${tmdbId}`);
  return null;
}

// ─── Récupération URL Vidéo ─────────────────────────────────────────────────────
async function purstream_getMovieUrl(purstreamId: number): Promise<string | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) return null;

    const sheet = await res.json();

    // Nouvelle structure principale
    if (sheet.urls?.length > 0) {
      console.log(`✅ [Movie] URL trouvée via "urls"`);
      return sheet.urls[0].url;
    }
    if (sheet.rls?.length > 0) {
      return sheet.rls[0].url;
    }
    if (sheet.sources?.length > 0) {
      return sheet.sources[0].url;
    }

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

    if (sheet.urls?.length > 0) {
      return sheet.urls[0].url;
    }
    if (sheet.rls?.length > 0) {
      return sheet.rls[0].url;
    }
    if (sheet.sources?.length > 0) {
      return sheet.sources[0].url;
    }

    return null;
  } catch (err) {
    console.error('[purstream_getEpisodeUrl]', err);
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

// ─── Extraction URL depuis le sheet Purstream ───────────────────────────────
// Structure réelle : { data: { items: { urls: [{url, name}], ... } } }
async function extractVideoUrl(
  purstreamId: number,
  type: 'movie' | 'series',
  season?: number,
  episode?: number
): Promise<string | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[extractVideoUrl] Sheet ${purstreamId} returned ${res.status}`);
      return null;
    }
    const json = await res.json();
    console.log(`[extractVideoUrl] Sheet keys:`, Object.keys(json));
    console.log(`[extractVideoUrl] json.data?.items keys:`, json?.data?.items ? Object.keys(json.data.items) : 'N/A');

    // La vraie structure : json.data.items
    const items = json?.data?.items ?? json;
    console.log(`[extractVideoUrl] items.urls:`, JSON.stringify(items.urls?.slice(0,1)));

    if (type === 'movie') {
      // urls est un tableau de { url, name }
      if (items.urls?.length > 0) {
        console.log(`[extractVideoUrl] ✅ URL found:`, items.urls[0].url?.substring(0, 60));
        return items.urls[0].url;
      }
      return items.video_url || items.url || null;
    } else {
      // Séries : cherche dans items.seasons[].episodes[]
      const seasonNum = season || 1;
      const episodeNum = episode || 1;

      // Structure possible : items.seasons[{number, episodes:[{number, urls:[]}]}]
      if (items.seasons?.length > 0) {
        const s = items.seasons.find((s: any) => s.number === seasonNum || s.season === seasonNum);
        if (s?.episodes?.length > 0) {
          const ep = s.episodes.find((e: any) => e.number === episodeNum || e.episode === episodeNum);
          if (ep?.urls?.length > 0) return ep.urls[0].url;
          if (ep?.url) return ep.url;
        }
      }

      // Structure plate : items.episodes[{season, episode, urls:[]}]
      if (items.episodes?.length > 0) {
        const ep = items.episodes.find(
          (e: any) => (e.season === seasonNum || e.seasonNumber === seasonNum) &&
                      (e.episode === episodeNum || e.episodeNumber === episodeNum || e.number === episodeNum)
        );
        if (ep?.urls?.length > 0) return ep.urls[0].url;
        if (ep?.url) return ep.url;
      }

      // Fallback : si c'est un film-like avec urls direct
      if (items.urls?.length > 0) return items.urls[0].url;
      return items.video_url || items.url || null;
    }
  } catch (err) {
    console.error('[extractVideoUrl]', err);
    return null;
  }
}

export async function getMovieVideoUrl(tmdbId: number, titleOverride?: string): Promise<string | null> {
  const movie = await getMovieById(tmdbId);
  if (movie?.video_url) return movie.video_url;

  const title = titleOverride || movie?.title || movie?.original_title || '';
  const purstreamId = await purstream_searchId(title, 'movie', tmdbId);
  if (!purstreamId) return null;

  return extractVideoUrl(purstreamId, 'movie');
}

export async function getEpisodeVideoUrl(
  tmdbId: number,
  season: number,
  episode: number,
  titleOverride?: string
): Promise<string | null> {
  const series = await getSeriesById(tmdbId);
  const title = titleOverride || series?.name || series?.original_name || '';
  const purstreamId = await purstream_searchId(title, 'series', tmdbId);
  if (!purstreamId) return null;

  return extractVideoUrl(purstreamId, 'series', season, episode);
}
