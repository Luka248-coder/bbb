'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { getBackdropUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'
import { useDrawer } from '@/components/movie-drawer'
import { useSession } from '@/components/session-provider'
import { TypewriterText } from '@/components/typewriter-text'

interface HeroProps {
  content: (Movie | Series)[]
}

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

// Couleur par genre_id TMDB
const GENRE_COLORS: Record<number, string> = {
  28:  '180,30,30',   // Action
  12:  '30,100,180',  // Aventure
  16:  '200,120,20',  // Animation
  35:  '180,140,20',  // Comédie
  80:  '60,60,80',    // Crime
  99:  '20,100,80',   // Documentaire
  18:  '100,40,140',  // Drame
  10751:'180,100,20', // Famille
  14:  '80,40,180',   // Fantastique
  36:  '140,90,20',   // Histoire
  27:  '80,10,10',    // Horreur
  10402:'160,60,160', // Musique
  9648: '20,60,120',  // Mystère
  10749:'180,40,80',  // Romance
  878: '20,80,160',   // Science-Fiction
  10770:'100,60,20',  // Téléfilm
  53:  '40,40,80',    // Thriller
  10752:'80,60,20',   // Guerre
  37:  '120,80,20',   // Western
}

function getGenreColor(genreIds: number[]): string {
  for (const id of genreIds) {
    if (GENRE_COLORS[id]) return GENRE_COLORS[id]
  }
  return '60,20,20'
}

export function Hero({ content }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFav, setIsFav] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [bgColor, setBgColor] = useState('10,5,6')
  const { openDrawer } = useDrawer()
  const { user } = useSession()

  const featured = content
    .filter(item => item.backdrop_path || item.poster_path)
    .slice(0, 5)

  // Couleur basée sur le genre du contenu courant
  useEffect(() => {
    if (!featured[currentIndex]) return
    const item = featured[currentIndex]
    const color = getGenreColor(item.genre_ids || [])
    setBgColor(color)
  }, [currentIndex])

  useEffect(() => {
    if (featured.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [featured.length])

  useEffect(() => {
    if (!user?.id || !featured[currentIndex]) return
    const current = featured[currentIndex]
    const tmdbId = current.tmdb_id || current.id
    const type = isMovie(current) ? 'movie' : 'series'
    const profileId = document.cookie.split('; ').find(r => r.startsWith('active_profile_id='))?.split('=')[1] || null
    const param = profileId ? `profile_id=${profileId}` : `user_id=${user.id}`
    fetch(`/api/favorites?${param}`)
      .then(r => r.json())
      .then((favs: any[]) => {
        setIsFav(favs.some(f => f.tmdb_id === tmdbId && f.content_type === type))
      })
      .catch(() => {})
  }, [currentIndex, user?.id])

  const toggleFav = async () => {
    if (!user?.id) return
    const current = featured[currentIndex]
    const tmdbId = current.tmdb_id || current.id
    const type = isMovie(current) ? 'movie' : 'series'
    const title = isMovie(current) ? current.title : current.name
    const poster = current.poster_path
    const profileId = document.cookie.split('; ').find(r => r.startsWith('active_profile_id='))?.split('=')[1] || null
    const param = profileId ? `profile_id=${profileId}` : `user_id=${user.id}`
    setFavLoading(true)
    try {
      if (isFav) {
        await fetch(`/api/favorites?${param}&tmdb_id=${tmdbId}&content_type=${type}`, { method: 'DELETE' })
        setIsFav(false)
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profileId ? null : user.id,
            profile_id: profileId || null,
            tmdb_id: tmdbId, content_type: type, title, poster
          }),
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
    <>
      {/* Fond dynamique global — derrière tout le reste de la page */}


    <section className="relative w-full overflow-hidden hero-section" style={{ minHeight: 600 }}>

      {featured.map((item, i) => {
        if (i === currentIndex) return null
        const src = item.backdrop_path
          ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
          : `https://image.tmdb.org/t/p/w780${item.poster_path}`
        return <link key={i} rel="preload" as="image" href={src} />
      })}

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
          <div className="absolute inset-x-0 bottom-0" style={{
            height: '75%',
            background: 'linear-gradient(to top, #050a14 0%, #050a14 8%, rgba(5,10,20,0.96) 20%, rgba(5,10,20,0.75) 38%, rgba(5,10,20,0.35) 58%, rgba(5,10,20,0.08) 78%, transparent 100%)'
          }} />
        </motion.div>
      </AnimatePresence>

      <div className="relative h-full flex items-end pb-24 px-4 md:px-16 lg:px-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-2xl w-full"
          >
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

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-5"
            >
              <HeroLogo tmdbId={tmdbId} type={type} title={title} />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-white/55 text-[15px] leading-relaxed mb-2 line-clamp-2 max-w-lg"
            >
              <TypewriterText text={current.overview || ''} speed={8} className="text-white/55 text-[15px] leading-relaxed" />
            </motion.p>

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

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex items-center gap-3 flex-wrap justify-start"
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
                disabled={favLoading || !user}
                className="flex items-center justify-center w-11 h-11 rounded-full border transition-all"
                style={{
                  background: isFav ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)',
                  borderColor: isFav ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.2)',
                }}
                title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {isFav
                  ? <BookmarkCheck className="w-4 h-4 text-blue-400" />
                  : <Bookmark className="w-4 h-4 text-white/60" />
                }
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {featured.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + featured.length) % featured.length)}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 group"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % featured.length)}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </>
      )}

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
    </>
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
