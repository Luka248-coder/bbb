'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Play, Star, Plus, Check } from 'lucide-react'
import { getPosterUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'
import { cn } from '@/lib/utils'
import { useDrawer } from '@/components/movie-drawer'

interface ContentCardProps {
  content: Movie | Series
  type: 'movie' | 'series'
  index?: number
  showRank?: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

export function ContentCard({
  content, type, index = 0, showRank = false, isFavorite = false, onToggleFavorite,
}: ContentCardProps) {
  const title = isMovie(content) ? content.title : content.name
  const releaseDate = isMovie(content) ? content.release_date : content.first_air_date
  const year = releaseDate ? new Date(releaseDate).getFullYear() : ''
  const tmdbId = content.tmdb_id || content.id
  const rank = index + 1
  const { openDrawer } = useDrawer()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      className="relative group flex-shrink-0"
    >
      {/* Rank number */}
      {showRank && (
        <div
          className="absolute -left-3 bottom-4 z-10 leading-none pointer-events-none select-none font-black text-primary/30"
          style={{ fontSize: '8rem', lineHeight: 1, WebkitTextStroke: '2px currentColor', fontFamily: 'Arial Black, sans-serif' }}
        >
          {rank}
        </div>
      )}

      <div
        className="block cursor-pointer"
        onClick={() => openDrawer(type, tmdbId)}
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-xl bg-card transition-all duration-300',
            showRank ? 'w-36 md:w-44 ml-8' : 'w-40 md:w-48',
            'aspect-[2/3]',
            'group-hover:shadow-2xl group-hover:shadow-primary/30 group-hover:ring-1 group-hover:ring-primary/40'
          )}
        >
          <Image
            src={getPosterUrl(content.poster_path)}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 160px, 192px"
          />

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs font-semibold text-white">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            {content.vote_average?.toFixed(1) ?? 'N/A'}
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl">
              <Play className="w-7 h-7 text-white fill-white ml-0.5" />
            </div>
          </div>

          {onToggleFavorite && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20"
                onClick={e => { e.stopPropagation(); onToggleFavorite() }}>
                {isFavorite ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Plus className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={cn('mt-3', showRank ? 'pl-10' : '')}>
        <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">{title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          {year && <span>{year}</span>}
          {content.genre_ids && content.genre_ids.length > 0 && (
            <><span>•</span><span className="truncate">{getGenreNames(content.genre_ids)[0]}</span></>
          )}
        </div>
      </div>
    </motion.div>
  )
}
