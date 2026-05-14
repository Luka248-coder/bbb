'use client'

import { motion } from 'framer-motion'
import { Search, Film, Tv } from 'lucide-react'
import { ContentCard } from '@/components/content-card'
import type { Movie, Series } from '@/lib/content-types'

interface SearchResultsProps {
  query: string
  movies: Movie[]
  series: Series[]
}

export function SearchResults({ query, movies, series }: SearchResultsProps) {
  const totalResults = movies.length + series.length

  if (totalResults === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Aucun résultat pour &quot;{query}&quot;
        </h2>
        <p className="text-muted-foreground">
          Essayez avec d&apos;autres termes de recherche
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Résultats pour &quot;{query}&quot;
        </h1>
        <p className="text-muted-foreground">
          {totalResults} résultat{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
        </p>
      </motion.div>

      {movies.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Film className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Films ({movies.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {movies.map((movie, index) => (
              <ContentCard
                key={`movie-${movie.id}-${index}`}
                content={movie}
                type="movie"
                index={index}
              />
            ))}
          </div>
        </section>
      )}

      {series.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Tv className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Séries ({series.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {series.map((show, index) => (
              <ContentCard
                key={`series-${show.id}-${index}`}
                content={show}
                type="series"
                index={index}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}