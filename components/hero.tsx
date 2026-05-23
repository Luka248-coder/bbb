'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info, Star, BookmarkPlus, VolumeX, Volume2 } from 'lucide-react'
import { getBackdropUrl, getPosterUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'

const TMDB_API_KEY = '1a6aed55d15f2da7f2f0ff0586c52174'

interface HeroProps {
  content: (Movie | Series)[]
}

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

async function fetchTrailerKey(tmdbId: number, type: 'movie' | 'series'): Promise<string | null> {
  const endpoint = type === 'movie' ? 'movie' : 'tv'
  try {
    // Essai en français d'abord, sinon en anglais
    const [frRes, enRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=fr-FR`),
      fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`),
    ])
    const [frData, enData] = await Promise.all([frRes.json(), enRes.json()])
    const videos = [...(frData.results || []), ...(enData.results || [])]
    const trailer =
      videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
      videos.find((v: any) => v.type === 'Teaser' && v.site === 'YouTube') ||
      videos.find((v: any) => v.site === 'YouTube')
    return trailer?.key || null
  } catch {
    return null
  }
}

export function Hero({ content }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [trailerKey, setTrailerKey] = useState<string | null>(null)
  const [trailerReady, setTrailerReady] = useState(false)
  const [muted, setMuted] = useState(true)
  const [trailerStarted, setTrailerStarted] = useState(false)
  const playerRef = useRef<any>(null)
  const trailerTimer = useRef<NodeJS.Timeout | null>(null)
  const featured = content.slice(0, 5)

  const current = featured[currentIndex]
  const title = isMovie(current) ? current.title : current.name
  const releaseDate = isMovie(current) ? current.release_date : current.first_air_date
  const year = releaseDate ? new Date(releaseDate).getFullYear() : ''
  const type = isMovie(current) ? 'movie' : 'series'
  const tmdbId = current.tmdb_id || current.id
  const genres = getGenreNames(current.genre_ids || []).slice(0, 3)

  // Auto-rotate slides
  useEffect(() => {
    if (featured.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % featured.length)
    }, trailerStarted ? 999999 : 8000)
    return () => clearInterval(interval)
  }, [featured.length, trailerStarted])

  // Load trailer after 2s on each slide
  useEffect(() => {
    setTrailerKey(null)
    setTrailerReady(false)
    setTrailerStarted(false)

    if (trailerTimer.current) clearTimeout(trailerTimer.current)
    trailerTimer.current = setTimeout(async () => {
      const key = await fetchTrailerKey(tmdbId, type)
      setTrailerKey(key)
    }, 2000)

    return () => {
      if (trailerTimer.current) clearTimeout(trailerTimer.current)
    }
  }, [currentIndex, tmdbId, type])

  if (featured.length === 0) return null

  return (
    <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
      {/* Background image (always visible, fades when trailer starts) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${currentIndex}`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: trailerStarted ? 0 : 1, scale: 1 }}
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
        </motion.div>
      </AnimatePresence>

      {/* YouTube trailer iframe */}
      {trailerKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: trailerStarted ? 1 : 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 z-0"
        >
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=${trailerKey}&rel=0&showinfo=0&modestbranding=1&playsinline=1&enablejsapi=1`}
            allow="autoplay; encrypted-media"
            className="w-full h-full scale-[1.35] pointer-events-none"
            style={{ border: 'none' }}
            onLoad={() => {
              setTrailerReady(true)
              setTimeout(() => setTrailerStarted(true), 800)
            }}
          />
          {/* Overlay gradients over trailer */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />
        </motion.div>
      )}

      {/* Mute toggle — only when trailer is playing */}
      <AnimatePresence>
        {trailerStarted && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setMuted(m => !m)}
            className="absolute bottom-20 right-6 z-20 w-10 h-10 rounded-full bg-black/50 border border-white/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-all"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right poster */}
      <AnimatePresence mode="wait">
        {!trailerStarted && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:block z-10"
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
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative h-full container mx-auto px-6 flex items-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="flex items-center gap-1.5 border border-white/30 rounded-lg px-2.5 py-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-3"
            >
              <HeroLogo tmdbId={tmdbId} type={type} title={title} />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white/60 text-base leading-relaxed mb-8 line-clamp-3 max-w-lg"
            >
              {current.overview || 'Aucune description disponible.'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link href={`/watch/${type}/${tmdbId}?play=1`}>
                <button className="flex items-center gap-2.5 bg-white hover:bg-white/90 text-black font-bold px-7 py-3 rounded-full transition-all shadow-xl text-sm">
                  <Play className="w-4 h-4 fill-current" />
                  Lecture
                </button>
              </Link>
              <Link href={`/watch/${type}/${tmdbId}`}>
                <button className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-6 py-3 rounded-full border border-white/20 transition-all text-sm">
                  <Info className="w-4 h-4" />
                  Fiche
                </button>
              </Link>
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-3 rounded-full border border-white/20 transition-all">
                <BookmarkPlus className="w-4 h-4" />
              </button>

              {/* Trailer badge */}
              {trailerKey && !trailerStarted && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 text-white/40 text-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Trailer en cours de chargement…
                </motion.span>
              )}
              {trailerStarted && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 text-white/40 text-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Trailer en lecture
                </motion.span>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide indicators */}
      {featured.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
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

function HeroLogo({ tmdbId, type, title }: { tmdbId: number; type: string; title: string }) {
  const [logoPath, setLogoPath] = useState<string | null>(null)

  useEffect(() => {
    const endpoint = type === 'movie' ? 'movie' : 'tv'
    fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/images?api_key=${TMDB_API_KEY}&include_image_language=fr,en,null`)
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

  return (
    <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight uppercase"
      style={{ textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>
      {title}
    </h1>
  )
}
