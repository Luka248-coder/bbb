'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPosterUrl, type Movie, type Series } from '@/lib/content-types'
import { useDrawer } from '@/components/movie-drawer'
import Link from 'next/link'

function isMovie(item: Movie | Series): item is Movie { return 'title' in item }

interface Top10RowProps {
  title: string
  content: (Movie | Series)[]
  type: 'movie' | 'series'
  accentColor?: string
}

export function Top10Row({ title, content, type, accentColor = '#f59e0b' }: Top10RowProps) {
  const { openDrawer } = useDrawer()
  const [active, setActive] = useState(0)
  const [logos, setLogos] = useState<Record<number, string | null>>({})
  const items = content.slice(0, 10)

  useEffect(() => {
    const mediaType = type === 'movie' ? 'movie' : 'series'
    Promise.all(items.map(async (item) => {
      const tmdbId = (item as any).tmdb_id || item.id
      try {
        const res = await fetch(`/api/content/${mediaType}/${tmdbId}`, { cache: 'force-cache' })
        if (!res.ok) return { id: item.id, logo: null }
        const data = await res.json()
        return { id: item.id, logo: data.logo ?? null }
      } catch { return { id: item.id, logo: null } }
    })).then(results => {
      const map: Record<number, string | null> = {}
      results.forEach(({ id, logo }) => { map[id] = logo })
      setLogos(map)
    })
  }, [content, type])

  if (items.length === 0) return null

  const current = items[active]
  const title_ = isMovie(current) ? current.title : current.name
  const releaseDate = isMovie(current) ? current.release_date : current.first_air_date
  const year = releaseDate ? new Date(releaseDate).getFullYear() : ''
  const tmdbId = (current as any).tmdb_id || current.id
  const overview = (current as any).overview || ''
  const logo = logos[current.id]

  return (
    <section className="relative py-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 md:px-16 mb-6 flex items-center gap-3">
        <div className="w-[3px] rounded-full self-stretch" style={{ background: `linear-gradient(to bottom, ${accentColor}, transparent)`, minHeight: '2rem' }} />
        <h2 className="text-2xl md:text-3xl font-black text-white">{title}</h2>
      </div>

      <div className="px-6 md:px-16 flex gap-6 items-stretch">

        {/* Preview grande carte gauche */}
        <div className="hidden lg:flex flex-col flex-shrink-0 w-72 relative overflow-hidden rounded-2xl" style={{ minHeight: 420 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <Image
                src={getPosterUrl(current.poster_path)}
                alt={title_}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }} />
            </motion.div>
          </AnimatePresence>

          {/* Rang actif */}
          <div className="absolute top-3 left-3 z-10">
            <span className="font-black text-white/90 text-5xl leading-none" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.3)', fontFamily: 'Arial Black, sans-serif', color: accentColor }}>
              #{active + 1}
            </span>
          </div>

          {/* Info bas */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {logo ? (
                  <img src={logo} alt={title_} className="max-h-12 max-w-[85%] object-contain object-left mb-2" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,1))' }} />
                ) : (
                  <p className="text-white font-black text-lg uppercase leading-tight mb-2">{title_}</p>
                )}
                <div className="flex items-center gap-2 mb-3 text-xs text-white/50">
                  {year && <span>{year}</span>}
                  {current.vote_average && <><span>·</span><span className="text-yellow-400">★ {current.vote_average.toFixed(1)}</span></>}
                </div>
                {overview && <p className="text-white/50 text-xs leading-relaxed line-clamp-2 mb-3">{overview}</p>}
                <div className="flex gap-2">
                  <Link href={`/watch/${type}/${tmdbId}?play=1`}>
                    <button className="flex items-center gap-1.5 bg-white hover:bg-white/90 text-black font-bold px-4 py-2 rounded-xl text-xs transition-all">
                      <Play className="w-3 h-3 fill-current" />Regarder
                    </button>
                  </Link>
                  <button
                    onClick={() => openDrawer(type as 'movie' | 'series', tmdbId)}
                    className="px-3 py-2 rounded-xl text-white/70 hover:text-white border border-white/20 hover:border-white/40 text-xs transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  >
                    Infos
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Liste numérotée droite */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2" style={{ scrollSnapType: 'x mandatory' }}>
            {items.map((item, i) => {
              const t = isMovie(item) ? item.title : item.name
              const tmdb = (item as any).tmdb_id || item.id
              const isActive = i === active
              const itemLogo = logos[item.id]

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex-shrink-0 cursor-pointer group/card"
                  style={{ scrollSnapAlign: 'start', width: 130 }}
                  onClick={() => setActive(i)}
                >
                  {/* Numéro géant superposé */}
                  <div className="relative" style={{ height: 190 }}>
                    {/* Numéro en arrière-plan */}
                    <div
                      className="absolute -bottom-3 -left-2 z-10 font-black leading-none pointer-events-none select-none transition-all duration-300"
                      style={{
                        fontSize: '7rem',
                        lineHeight: 1,
                        fontFamily: 'Arial Black, sans-serif',
                        WebkitTextStroke: isActive ? `2px ${accentColor}` : '1.5px rgba(255,255,255,0.15)',
                        color: 'transparent',
                        textShadow: isActive ? `0 0 30px ${accentColor}40` : 'none',
                      }}
                    >
                      {i + 1}
                    </div>

                    {/* Poster */}
                    <div
                      className="absolute right-0 top-0 overflow-hidden rounded-xl transition-all duration-300"
                      style={{
                        width: 90,
                        height: 135,
                        boxShadow: isActive ? `0 8px 32px rgba(0,0,0,0.8), 0 0 0 2px ${accentColor}` : '0 4px 16px rgba(0,0,0,0.6)',
                        transform: isActive ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      <Image
                        src={getPosterUrl(item.poster_path)}
                        alt={t}
                        fill
                        className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                      />
                      {/* Overlay hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200" style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                          <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Titre sous la carte */}
                  <div className="mt-2 pl-1">
                    {itemLogo ? (
                      <img src={itemLogo} alt={t} className="max-h-5 max-w-full object-contain object-left" style={{ filter: 'brightness(0.8) contrast(1.2)' }} />
                    ) : (
                      <p className={`text-xs font-semibold truncate transition-colors duration-200 ${isActive ? 'text-white' : 'text-white/50 group-hover/card:text-white/80'}`}>{t}</p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
