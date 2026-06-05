'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info, Bookmark, BookmarkCheck } from 'lucide-react'
import { getBackdropUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'
import { useDrawer } from '@/components/movie-drawer'
import { useSession } from 'next-auth/react'

interface HeroProps {
  content: (Movie | Series)[]
}

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

export function Hero({ content }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFav, setIsFav] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const { openDrawer } = useDrawer()
  const { data: session } = useSession()

  // Filtrer uniquement les contenus qui ont un backdrop OU un poster
  const featured = content
    .filter(item => item.backdrop_path || item.poster_path)
    .slice(0, 5)

  useEffect(() => {
    if (featured.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [featured.length])

  // Vérifier si le film courant est en favoris
  useEffect(() => {
    if (!session?.user?.id || !featured[currentIndex]) return
    const current = featured[currentIndex]
    const tmdbId = current.tmdb_id || current.id
    const type = isMovie(current) ? 'movie' : 'series'
    fetch(`/api/favorites?user_id=${session.user.id}`)
      .then(r => r.json())
      .then((favs: any[]) => {
        setIsFav(favs.some(f => f.tmdb_id === tmdbId && f.content_type === type))
      })
      .catch(() => {})
  }, [currentIndex, session?.user?.id])

  const toggleFav = async () => {
    if (!session?.user?.id) return
    const current = featured[currentIndex]
    const tmdbId = current.tmdb_id || current.id
    const type = isMovie(current) ? 'movie' : 'series'
    const title = isMovie(current) ? current.title : current.name
    const poster = current.poster_path
    setFavLoading(true)
    try {
      if (isFav) {
        await fetch(`/api/favorites?user_id=${session.user.id}&tmdb_id=${tmdbId}&content_type=${type}`, { method: 'DELETE' })
        setIsFav(false)
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: session.user.id, tmdb_id: tmdbId, content_type: type, title, poster }),
        })
        setIsFav(true)
      }
    } finally {
      setFavLoading(false)
    }
  }

  if (featured.length === 0) return null

  const current = featured[currentIndex]
  const title = isMovie(current) ? current.title : current.name
  const releaseDate = isMovie(current) ? current.release_date : current.first_air_date
  const year = releaseDate ? new Date(releaseDate).getFullYear() : ''
  const type = isMovie(current) ? 'movie' : 'series'
  const tmdbId = current.tmdb_id || current.id
  const genres = getGenreNames(current.genre_ids || []).slice(0, 3)

  return (
    <section className="relative w-full overflow-hidden hero-section" style={{ minHeight: 600 }}>

      {/* Préchargement des images suivantes */}
      {featured.map((item, i) => {
        if (i === currentIndex) return null
        const src = item.backdrop_path
          ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
          : `https://image.tmdb.org/t/p/w780${item.poster_path}`
        return <link key={i} rel="preload" as="image" href={src} />
      })}

      {/* Backdrop plein écran */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <Image
            src={current.backdrop_path
              ? `https://image.tmdb.org/t/p/original${current.backdrop_path}`
              : `https://image.tmdb.org/t/p/w780${current.poster_path}`}
            alt={title}
            fill priority
            className={current.backdrop_path ? "object-cover object-top" : "object-cover object-center"}
          />
          {/* Dégradé bas uniquement — fondu vers le contenu */}
          <div className="absolute inset-x-0 bottom-0" style={{
            height: '75%',
            background: 'linear-gradient(to top, #0a0506 0%, #0a0506 8%, rgba(10,5,6,0.96) 20%, rgba(10,5,6,0.75) 38%, rgba(10,5,6,0.35) 58%, rgba(10,5,6,0.08) 78%, transparent 100%)'
          }} />
        </motion.div>
      </AnimatePresence>

      {/* Contenu gauche */}
      <div className="relative h-full flex items-end pb-24 px-8 md:px-16 lg:px-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-2xl w-full"
          >
            {/* Genres */}
            {genres.length > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-white/40 text-xs uppercase tracking-[0.2em] mb-4 font-medium"
              >
                {genres.join('  ·  ')}
              </motion.p>
            )}

            {/* Logo ou titre */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-5"
            >
              <HeroLogo tmdbId={tmdbId} type={type} title={title} />
            </motion.div>

            {/* Synopsis */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-white/55 text-[15px] leading-relaxed mb-2 line-clamp-2 max-w-lg"
            >
              {current.overview || ''}
            </motion.p>

            {/* Année + note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 mb-7 text-sm text-white/40"
            >
              {year && <span className="font-semibold text-white/60">{year}</span>}
              {year && current.vote_average && <span className="text-white/20">·</span>}
              {current.vote_average && (
                <span className="text-white/60 font-semibold">★ {current.vote_average.toFixed(1)}</span>
              )}
            </motion.div>

            {/* Boutons */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex items-center gap-3 flex-wrap"
            >
              <Link href={`/watch/${type}/${tmdbId}?play=1`}>
                <button className="flex items-center gap-2.5 bg-white hover:bg-white/90 text-black font-bold px-7 py-3 rounded-full transition-all shadow-xl text-sm tracking-wide">
                  <Play className="w-4 h-4 fill-current" />
                  Regarder
                </button>
              </Link>

              <button
                onClick={() => openDrawer(type as 'movie' | 'series', tmdbId)}
                className="flex items-center gap-2 text-white/70 hover:text-white font-semibold px-5 py-3 rounded-full border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all text-sm"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <Info className="w-4 h-4" />
                Plus d&apos;infos
              </button>

              <button
                onClick={toggleFav}
                disabled={favLoading || !session}
                className="flex items-center justify-center w-11 h-11 rounded-full border transition-all"
                style={{
                  background: isFav ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)',
                  borderColor: isFav ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.2)',
                }}
                title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {isFav
                  ? <BookmarkCheck className="w-4 h-4 text-red-400" />
                  : <Bookmark className="w-4 h-4 text-white/60" />
                }
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicateurs */}
      {featured.length > 1 && (
        <div className="absolute bottom-8 right-8 md:right-16 flex gap-2 items-center">
          {featured.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-6 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/50'
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
        width={420}
        height={180}
        className="max-h-36 w-auto object-contain object-left"
        style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.9))' }}
      />
    )
  }

  return (
    <h1
      className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight uppercase"
      style={{ textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}
    >
      {title}
    </h1>
  )
}
