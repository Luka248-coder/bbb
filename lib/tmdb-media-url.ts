/**
 * Les liens Purstream embarquent souvent le TMDB id dans le chemin
 * (ex. /movies/102207-k1lte/master.m3u8). On s'en sert pour refuser
 * un autre film homonyme (Marsupilami 2026 vs Sur la piste du Marsupilami).
 */
export function extractTmdbIdsFromMediaUrl(url: string): number[] {
  if (!url) return []
  const ids = new Set<number>()
  try {
    const u = new URL(url)
    const hay = `${u.pathname}${u.search}`
    const patterns = [
      /\/movies\/(\d{3,8})(?:[-/_]|\.|$)/i,
      /\/movie\/(\d{3,8})(?:[-/_]|\.|$)/i,
      /\/tv\/(\d{3,8})(?:[-/_]|\.|$)/i,
      /\/series\/(\d{3,8})(?:[-/_]|\.|$)/i,
      /\/tmdb\/(\d{3,8})(?:[-/_]|\.|$)/i,
      /[?&](?:tmdb(?:_id)?|tmdbId)=(\d{3,8})/i,
    ]
    for (const re of patterns) {
      const m = hay.match(re)
      if (m) ids.add(Number(m[1]))
    }
  } catch {}
  return [...ids]
}

export function mediaUrlMatchesTmdb(url: string | null | undefined, tmdbId: number | string | null | undefined): boolean {
  if (!url || !tmdbId) return true
  const expected = Number(tmdbId)
  if (!Number.isFinite(expected) || expected <= 0) return true
  const ids = extractTmdbIdsFromMediaUrl(url)
  if (ids.length === 0) return true
  return ids.includes(expected)
}

export function sheetTmdbMatches(sheet: any, tmdbId: number | string | null | undefined): boolean {
  if (!tmdbId || !sheet || typeof sheet !== 'object') return true
  const expected = String(tmdbId)
  const found = sheet.tmdbId ?? sheet.tmdb_id ?? sheet.tmdb
  if (found == null || found === '') return true
  return String(found) === expected
}
