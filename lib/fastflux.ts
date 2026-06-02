// SERVEUR UNIQUEMENT — ne pas importer dans des Client Components
import { createClient } from '@/lib/supabase/server'
import type { Movie, Series, Episode } from '@/lib/content-types'

export type { Movie, Series, Episode } from '@/lib/content-types'
export { GENRES, getGenreNames, getPosterUrl, getBackdropUrl } from '@/lib/content-types'

const PURSTREAM_BASE = 'https://api.purstream.ac/api/v1'

const PURSTREAM_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://purstream.ac/',
  'Origin': 'https://purstream.ac',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'Connection': 'keep-alive',
}

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
        const r = await fetch(url, { headers: PURSTREAM_HEADERS, cache: 'no-store' });
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
      const r = await fetch(url, { headers: PURSTREAM_HEADERS, cache: 'no-store' });
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
      headers: PURSTREAM_HEADERS,
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
      headers: PURSTREAM_HEADERS,
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
async function extractVideoUrl(
  purstreamId: number,
  type: 'movie' | 'series',
  season?: number,
  episode?: number
): Promise<string | null> {
  try {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: PURSTREAM_HEADERS,
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[extractVideoUrl] Sheet ${purstreamId} returned ${res.status}`);
      return null;
    }
    const json = await res.json();

    // Log complet de la structure pour debug
    const items = json?.data?.items ?? json?.data ?? json;
    console.log(`[extractVideoUrl] type=${type} season=${season} ep=${episode}`);
    console.log(`[extractVideoUrl] top-level keys:`, Object.keys(json));
    console.log(`[extractVideoUrl] items keys:`, Object.keys(items));
    if (items.seasons) console.log(`[extractVideoUrl] seasons count:`, items.seasons.length, '| first season:', JSON.stringify(items.seasons[0]).slice(0, 200));
    if (items.episodes) console.log(`[extractVideoUrl] episodes count:`, items.episodes.length, '| first ep:', JSON.stringify(items.episodes[0]).slice(0, 200));
    if (items.urls) console.log(`[extractVideoUrl] urls count:`, items.urls.length, '| first url:', JSON.stringify(items.urls[0]).slice(0, 100));

    if (type === 'movie') {
      if (items.urls?.length > 0) return items.urls[0].url;
      return items.video_url || items.url || null;
    }

    // ── SÉRIES ──
    const seasonNum = season ?? 1;
    const episodeNum = episode ?? 1;

    // Format 1 : items.seasons[{number|season, episodes:[{number|episode, urls:[{url}]}]}]
    if (items.seasons?.length > 0) {
      const s = items.seasons.find((s: any) =>
        Number(s.number ?? s.season ?? s.season_number) === seasonNum
      );
      console.log(`[extractVideoUrl] Format1 - found season:`, !!s, '| episodes:', s?.episodes?.length);
      if (s?.episodes?.length > 0) {
        const ep = s.episodes.find((e: any) =>
          Number(e.number ?? e.episode ?? e.episode_number) === episodeNum
        );
        console.log(`[extractVideoUrl] Format1 - found ep:`, !!ep, JSON.stringify(ep)?.slice(0, 150));
        if (ep?.urls?.length > 0) return ep.urls[0].url;
        if (ep?.url) return ep.url;
        if (ep?.video_url) return ep.video_url;
      }
    }

    // Format 2 : items.episodes[{season|season_number, episode|episode_number, urls:[{url}]}]
    if (items.episodes?.length > 0) {
      const ep = items.episodes.find((e: any) => {
        const s = Number(e.season ?? e.season_number ?? e.seasonNumber);
        const n = Number(e.episode ?? e.episode_number ?? e.episodeNumber ?? e.number);
        return s === seasonNum && n === episodeNum;
      });
      console.log(`[extractVideoUrl] Format2 - found ep:`, !!ep, JSON.stringify(ep)?.slice(0, 150));
      if (ep?.urls?.length > 0) return ep.urls[0].url;
      if (ep?.url) return ep.url;
      if (ep?.video_url) return ep.video_url;
    }

    // Format 3 : items directement est un tableau d'épisodes
    if (Array.isArray(items)) {
      const ep = items.find((e: any) => {
        const s = Number(e.season ?? e.season_number);
        const n = Number(e.episode ?? e.episode_number ?? e.number);
        return s === seasonNum && n === episodeNum;
      });
      if (ep?.urls?.length > 0) return ep.urls[0].url;
      if (ep?.url) return ep.url;
    }

    // Format 4 : items.urls avec index basé sur l'épisode (ex: épisodes plats)
    // NE PAS utiliser comme fallback — trop risqué de retourner le mauvais
    console.warn(`[extractVideoUrl] ❌ Episode S${seasonNum}E${episodeNum} not found in any known structure`);
    return null;

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
