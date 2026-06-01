'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { getPosterUrl, type Movie, type Series } from '@/lib/content-types'

interface ContentCardProps {
  content: Movie | Series
  type: 'movie' | 'series'
  index?: number
  showRank?: boolean
  logoUrl?: string | null
}

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

export function ContentCard({ content, type, index = 0, showRank = false, logoUrl }: ContentCardProps) {
  const title = isMovie(content) ? content.title : (content as Series).name
  const date = isMovie(content) ? content.release_date : (content as Series).first_air_date
  const year = date ? new Date(date).getFullYear() : ''
  const tmdbId = (content as any).tmdb_id || content.id

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="flex-shrink-0 w-[140px] md:w-[160px] group cursor-pointer"
    >
      <Link href={`/watch/${type}/${tmdbId}`}>
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2">
          {/* Rank badge */}
          {showRank && index !== undefined && (
            <div className="absolute top-2 left-2 z-10 w-7 h-7 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center text-white text-xs font-black border border-white/10">
              {index + 1}
            </div>
          )}

          {/* Poster */}
          <Image
            src={getPosterUrl(content.poster_path)}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="180px"
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-white fill-white ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Rating */}
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-white/70 text-[10px] font-bold">
            ★ {content.vote_average?.toFixed(1)}
          </div>
        </div>

        {/* Logo or title */}
        {logoUrl ? (
          <div className="h-8 flex items-center">
            <Image
              src={logoUrl}
              alt={title}
              width={120}
              height={32}
              className="object-contain max-h-8 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
        ) : (
          <>
            <p className="text-white text-xs font-semibold truncate">{title}</p>
            {year && <p className="text-white/30 text-xs">{year}</p>}
          </>
        )}
      </Link>
    </motion.div>
  )
}
