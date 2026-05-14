'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Film, Tv } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getPosterUrl, type Movie, type Series } from '@/lib/content-types'

interface GenrePageProps {
  genreId: number
  genreName: string
  movies: Movie[]
  series: Series[]
}

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

export function GenrePage({ genreId, genreName, movies, series }: GenrePageProps) {
  const [tab, setTab] = useState<'movies' | 'series'>('movies')

  const items = tab === 'movies' ? movies : series
  const count = items.length

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-2">{genreName}</h1>
        <p className="text-white/40 text-sm">
          {tab === 'movies' ? 'Films' : 'Séries'} · {count} résultat{count > 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setTab('movies')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
            tab === 'movies'
              ? 'bg-primary text-white'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          <Film className="w-4 h-4" />
          Films
          <span className={`px-1.5 py-0.5 rounded text-xs font-black ${tab === 'movies' ? 'bg-white/20' : 'bg-white/10'}`}>
            {movies.length}
          </span>
        </button>
        <button
          onClick={() => setTab('series')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
            tab === 'series'
              ? 'bg-primary text-white'
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          <Tv className="w-4 h-4" />
          Séries
          <span className={`px-1.5 py-0.5 rounded text-xs font-black ${tab === 'series' ? 'bg-white/20' : 'bg-white/10'}`}>
            {series.length}
          </span>
        </button>
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3"
        >
          {items.map((item, index) => {
            const title = isMovie(item) ? item.title : (item as Series).name
            const date = isMovie(item) ? item.release_date : (item as Series).first_air_date
            const year = date ? new Date(date).getFullYear() : ''
            const type = isMovie(item) ? 'movie' : 'series'
            const tmdbId = item.tmdb_id || item.id

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <Link href={`/watch/${type}/${tmdbId}`}>
                  <div className="group cursor-pointer">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2">
                      <Image
                        src={getPosterUrl(item.poster_path)}
                        alt={title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14vw"
                      />
                      {/* Note badge */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
                        <span className="text-white/50 text-[10px] font-bold uppercase">Note</span>
                        <span className="text-white text-[10px] font-black">{item.vote_average?.toFixed(1)}</span>
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-white text-xs font-semibold truncate">{title}</p>
                    {year && <p className="text-white/40 text-xs">{year}</p>}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {items.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/30 text-lg">Aucun contenu dans cette catégorie pour le moment.</p>
        </div>
      )}
    </div>
  )
}