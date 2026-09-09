'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, ChevronRight, ChevronLeft, Star, Info } from 'lucide-react'
import { getBackdropUrl, getPosterUrl, getGenreNames, type Movie, type Series } from '@/lib/content-types'
import { useDrawer } from '@/components/movie-drawer'

function isMovie(item: Movie | Series): item is Movie {
  return 'title' in item
}

function itemTitle(item: Movie | Series) {
  return isMovie(item) ? (item.title || item.original_title) : (item.name || item.original_name)
}

function itemYear(item: Movie | Series) {
  const d = isMovie(item) ? item.release_date : item.first_air_date
  if (!d) return ''
  const y = new Date(d).getFullYear()
  return Number.isFinite(y) ? String(y) : ''
}

function FeaturedLogo({ tmdbId, type, title }: { tmdbId: number; type: string; title: string }) {
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setLogoPath(null)
    const endpoint = type === 'movie' ? 'movie' : 'tv'
    fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/images?api_key=1a6aed55d15f2da7f2f0ff0586c52174&include_image_language=fr,en,null`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const logos = data.logos || []
        const logo = logos.find((l: { iso_639_1: string }) => l.iso_639_1 === 'fr')
          || logos.find((l: { iso_639_1: string }) => l.iso_639_1 === 'en')
          || logos[0]
        if (logo) setLogoPath(logo.file_path)
        setReady(true)
      })
      .catch(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [tmdbId, type])

  if (!ready) {
    return <div className="h-16 md:h-24 w-48 rounded-lg bg-white/5 animate-pulse" />
  }

  if (logoPath) {
    return (
      <Image
        src={`https://image.tmdb.org/t/p/w500${logoPath}`}
        alt={title}
        width={480}
        height={160}
        className="object-contain object-left max-h-[72px] md:max-h-[110px] w-auto drop-shadow-2xl"
      />
    )
  }

  return (
    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none drop-shadow-2xl">
      {title}
    </h2>
  )
}

interface FeaturedBannerProps {
  movies: Movie[]
  series: Series[]
}

const SLIDE_MS = 8000

export function FeaturedBanner({ movies, series }: FeaturedBannerProps) {
  const { openDrawer } = useDrawer()
  const router = useRouter()
  const picks = useMemo(() => (
    [...movies, ...series]
      .filter(i => i.backdrop_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 5)
  ), [movies, series])

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (picks.length <= 1 || paused) return
    const started = Date.now()
    const tick = setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / SLIDE_MS) * 100)
      setProgress(p)
      if (p >= 100) {
        setIndex(i => (i + 1) % picks.length)
        setProgress(0)
      }
    }, 50)
    return () => clearInterval(tick)
  }, [index, paused, picks.length])

  useEffect(() => { setProgress(0) }, [index])

  if (picks.length === 0) return null

  const pick = picks[index]
  const title = itemTitle(pick)
  const year = itemYear(pick)
  const type = isMovie(pick) ? 'movie' : 'series'
  const tmdbId = pick.tmdb_id || pick.id
  const genres = getGenreNames(pick.genre_ids || []).slice(0, 3)

  const go = (dir: number) => {
    setIndex(i => (i + dir + picks.length) % picks.length)
    setProgress(0)
  }

  return (
    <section className="px-4 md:px-8 py-6 md:py-8">
      <div
        className="relative overflow-hidden rounded-3xl min-h-[420px] md:min-h-[520px] bg-[#08080a] border border-white/[0.07]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={tmdbId}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <motion.div
              className="absolute inset-0"
              animate={{ scale: [1.04, 1.12] }}
              transition={{ duration: 16, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
            >
              <Image
                src={getBackdropUrl(pick.backdrop_path)}
                alt=""
                fill
                priority={index === 0}
                className="object-cover object-center"
                sizes="100vw"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/55 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080a]/90 via-[#08080a]/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.18),transparent_55%)]" />

        <div className="relative z-10 flex flex-col md:flex-row min-h-[420px] md:min-h-[520px]">
          <div className="flex-1 flex flex-col justify-end p-6 md:p-10 lg:p-12 max-w-3xl">
            <motion.div
              key={`meta-${tmdbId}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-extrabold tracking-[0.18em] uppercase text-red-400 bg-red-600/15 border border-red-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#dc2626]" />
                À la une
              </span>
              <span className="text-white/35 text-xs font-medium">
                {isMovie(pick) ? 'Film' : 'Série'}
                {year ? ` · ${year}` : ''}
              </span>
            </motion.div>

            <motion.div
              key={`logo-${tmdbId}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="mb-4"
            >
              <FeaturedLogo tmdbId={tmdbId} type={type} title={title} />
            </motion.div>

            <motion.div
              key={`chips-${tmdbId}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.28 }}
              className="flex items-center gap-2 flex-wrap mb-4"
            >
              {pick.vote_average > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-400 text-sm font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {pick.vote_average.toFixed(1)}
                </span>
              )}
              {genres.map(g => (
                <span key={g} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white/60 bg-white/10 border border-white/10">
                  {g}
                </span>
              ))}
            </motion.div>

            {pick.overview && (
              <motion.p
                key={`ov-${tmdbId}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.36 }}
                className="text-white/65 text-sm md:text-[15px] leading-relaxed line-clamp-2 md:line-clamp-3 max-w-xl mb-6"
              >
                {pick.overview}
              </motion.p>
            )}

            <motion.div
              key={`cta-${tmdbId}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.44 }}
              className="flex items-center gap-3 flex-wrap"
            >
              <button
                type="button"
                onClick={() => router.push(`/watch/${type}/${tmdbId}?play=1`)}
                className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-white text-black text-sm font-black tracking-widest uppercase hover:scale-[1.03] active:scale-[0.98] transition-transform shadow-lg"
              >
                <Play className="w-4 h-4 fill-black pointer-events-none" />
                Lecture
              </button>
              <button
                type="button"
                onClick={() => openDrawer(type, tmdbId)}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 border border-white/15 text-white backdrop-blur-md hover:bg-white/16 active:scale-[0.96] transition-all"
                aria-label="Plus d’infos"
              >
                <Info className="w-5 h-5 pointer-events-none" />
              </button>
            </motion.div>
          </div>

          {pick.poster_path && (
            <motion.div
              key={`poster-${tmdbId}`}
              initial={{ opacity: 0, x: 40, rotate: 3 }}
              animate={{ opacity: 1, x: 0, rotate: -2 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:flex items-end pr-12 pb-12"
            >
              <div className="relative w-[180px] aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15 rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                <Image src={getPosterUrl(pick.poster_path)} alt={title} fill className="object-cover" sizes="180px" />
              </div>
            </motion.div>
          )}
        </div>

        {picks.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Précédent"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 border border-white/15 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-md hidden md:flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Suivant"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 border border-white/15 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-md hidden md:flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {picks.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex gap-1.5 px-6 md:px-10 pb-3">
            {picks.map((item, i) => (
              <button
                key={item.tmdb_id || item.id}
                type="button"
                onClick={() => { setIndex(i); setProgress(0) }}
                className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden"
              >
                <span
                  className="block h-full bg-red-500 rounded-full origin-left"
                  style={{
                    width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
                    transition: i === index ? 'none' : 'width 0.3s',
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
