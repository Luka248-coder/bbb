import type { SupabaseClient } from '@supabase/supabase-js'

/** PostgREST / Supabase coupe chaque SELECT à 1000 lignes par défaut. */
export const SUPABASE_PAGE_SIZE = 1000

type FilterBuilder = {
  range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
}

/**
 * Relance la requête par paquets de 1000 jusqu'à tout récupérer.
 * `build` doit recréer le builder à chaque appel (il n'est pas réutilisable).
 */
export async function fetchAllRows<T>(build: () => FilterBuilder): Promise<T[]> {
  const all: T[] = []
  let from = 0

  for (;;) {
    const { data, error } = await build().range(from, from + SUPABASE_PAGE_SIZE - 1)
    if (error) {
      console.error('[fetchAllRows]', error.message)
      break
    }
    const rows = (data || []) as T[]
    all.push(...rows)
    if (rows.length < SUPABASE_PAGE_SIZE) break
    from += SUPABASE_PAGE_SIZE
    if (from >= 200_000) break
  }

  return all
}

export async function fetchAllFromTable<T>(
  supabase: SupabaseClient,
  table: string,
  columns = '*',
): Promise<T[]> {
  return fetchAllRows<T>(() => supabase.from(table).select(columns) as unknown as FilterBuilder)
}
