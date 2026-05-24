'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info, Star, Clock, BookmarkPlus } from 'lucide-react'
import { getBackdropUrl, getPosterUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'

interface HeroProps {
  content: (Movie | Series)[]
}

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

export function Hero({ content }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const featured = content.slice(0, 5)

  useEffect(() => {
    if (featured.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [featured.length])

  if (featured.length === 0) return null

  const current = featured[currentIndex]
  const title = isMovie(current) ? current.title : current.name
  const releaseDate = isMovie(current) ? current.release_date : current.first_air_date
  const year = releaseDate ? new Date(releaseDate).getFullYear() : ''
  const type = isMovie(current) ? 'movie' : 'series'
  const tmdbId = current.tmdb_id || current.id
  const genres = getGenreNames(current.genre_ids || []).slice(0, 3)

  // Essaie de charger le logo TMDB (via poster comme fallback)
  const logoUrl = `https://image.tmdb.org/t/p/w500${current.poster_path}`

  return (
    <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <Image
            src={getBackdropUrl(current.backdrop_path)}
            alt={title}
            fill priority
            className="object-cover object-top"
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/30" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#12080a] to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Right poster */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:block"
          style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.9))' }}
        >
          <div className="relative">
            <Image
              src={getPosterUrl(current.poster_path)}
              alt={title}
              width={200}
              height={300}
              className="rounded-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm rounded-b-2xl py-2 text-center">
              <span className="text-white text-xs font-bold tracking-widest uppercase">
                {type === 'movie' ? 'Film' : 'Série'}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative h-full container mx-auto px-6 flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-xl"
          >
            {/* Note + année */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="flex items-center gap-1.5 border border-white/30 rounded-lg px-2.5 py-1">
                <span className="text-white/50 text-xs uppercase tracking-wider font-medium">Note</span>
                <span className="text-white font-bold text-sm">{current.vote_average?.toFixed(1) ?? 'N/A'}</span>
              </div>
              {year && (
                <div className="border border-white/30 rounded-lg px-2.5 py-1">
                  <span className="text-white font-bold text-sm">{year}</span>
                </div>
              )}
              {genres.length > 0 && (
                <span className="text-white/40 text-sm uppercase tracking-wider">
                  {genres.join(' · ')}
                </span>
              )}
            </motion.div>

            {/* Logo/Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-3"
            >
              {/* Essaie d'afficher le logo TMDB, sinon le titre texte */}
              <HeroLogo tmdbId={tmdbId} type={type} title={title} />
            </motion.div>

            {/* Genres */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-white/40 text-sm uppercase tracking-widest mb-4"
            >
              {genres.join(' · ')}
            </motion.p>

            {/* Overview */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white/60 text-base leading-relaxed mb-8 line-clamp-3 max-w-lg"
            >
              {current.overview || 'Aucune description disponible.'}
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center gap-3"
            >
              {/* Lecture */}
              <Link href={`/watch/${type}/${tmdbId}?play=1`}>
                <button className="flex items-center gap-2.5 bg-white hover:bg-white/90 text-black font-bold px-7 py-3 rounded-full transition-all shadow-xl text-sm">
                  <Play className="w-4 h-4 fill-current" />
                  Lecture
                </button>
              </Link>

              {/* Fiche */}
              <Link href={`/watch/${type}/${tmdbId}`}>
                <button className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-6 py-3 rounded-full border border-white/20 transition-all text-sm">
                  <Info className="w-4 h-4" />
                  Fiche
                </button>
              </Link>

              {/* Favoris */}
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-3 rounded-full border border-white/20 transition-all">
                <BookmarkPlus className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide indicators */}
      {featured.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {featured.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'w-8 bg-primary' : 'w-4 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// Composant qui charge le logo TMDB ou affiche le titre en fallback
function HeroLogo({ tmdbId, type, title }: { tmdbId: number; type: string; title: string }) {
  const [logoPath, setLogoPath] = useState<string | null>(null)

  useEffect(() => {
    const endpoint = type === 'movie' ? 'movie' : 'tv'
    const apiKey = '1a6aed55d15f2da7f2f0ff0586c52174'
    fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/images?api_key=${apiKey}&include_image_language=fr,en,null`)
      .then(r => r.json())
      .then(data => {
        const logos = data.logos || []
        const logo = logos.find((l: any) => l.iso_639_1 === 'fr') || logos.find((l: any) => l.iso_639_1 === 'en') || logos[0]
        if (logo) setLogoPath(logo.file_path)
      })
      .catch(() => {})
  }, [tmdbId, type])

  if (logoPath) {
    return (
      <Image
        src={`https://image.tmdb.org/t/p/w500${logoPath}`}
        alt={title}
        width={400}
        height={200}
        className="max-h-40 w-auto object-contain"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))' }}
      />
    )
  }

  // Fallback : titre en texte style logo
  return (
    <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight uppercase"
      style={{ textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>
      {title}
    </h1>
  )
}
