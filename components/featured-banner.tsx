'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, ChevronRight } from 'lucide-react'
import { type Movie, type Series } from '@/lib/content-types'
import { useDrawer } from '@/components/movie-drawer'

function isMovie(item: Movie | Series): item is Movie { return 'title' in item }

interface FeaturedBannerProps {
  movies: Movie[]
  series: Series[]
}

function FeaturedLogo({ tmdbId, type, title }: { tmdbId: number; type: string; title: string }) {
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    const endpoint = type === 'movie' ? 'movie' : 'tv'
    fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/images?api_key=1a6aed55d15f2da7f2f0ff0586c52174&include_image_language=fr,en,null`)
      .then(r => r.json())
      .then(data => {
        const logos = data.logos || []
        const logo = logos.find((l: any) => l.iso_639_1 === 'fr') || logos.find((l: any) => l.iso_639_1 === 'en') || logos[0]
        if (logo) setLogoPath(logo.file_path)
        setTried(true)
      })
      .catch(() => setTried(true))
  }, [tmdbId, type])

  if (!tried) return <div className="h-14 w-48 bg-white/5 rounded animate-pulse" />

  if (logoPath) {
    return (
      <Image
        src={`https://image.tmdb.org/t/p/w500${logoPath}`}
        alt={title}
        width={320}
        height={120}
        className="max-h-20 w-auto object-contain object-left"
        style={{ filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.9))' }}
      />
    )
  }

  return (
    <h2 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight uppercase"
      style={{ textShadow: '0 4px 16px rgba(0,0,0,0.8)' }}>
      {title}
    </h2>
  )
}

export function FeaturedBanner({ movies, series }: FeaturedBannerProps) {
  const { openDrawer } = useDrawer()

  // Sélectionne le contenu le plus populaire qui a un backdrop
  const pick = [...movies, ...series]
    .filter(item => item.backdrop_path)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0]

  if (!pick) return null

  const title = isMovie(pick) ? pick.title : pick.name
  const releaseDate = isMovie(pick) ? pick.release_date : (pick as Series).first_air_date
  const year = releaseDate ? new Date(releaseDate).getFullYear() : ''
  const type = isMovie(pick) ? 'movie' : 'series'
  const tmdbId = pick.tmdb_id || pick.id
  const typeLabel = isMovie(pick) ? 'FILM' : 'SÉRIE'

  return (
    <section className="px-4 md:px-8 py-6">
      {/* En-tête */}
      <div className="mb-4 flex items-center gap-3">
        <div className="w-[3px] h-4 rounded-sm bg-red-600" />
        <h2 className="text-base md:text-lg font-bold text-white tracking-wide">À la une</h2>
        <span className="text-zinc-500 text-sm">Notre sélection du moment</span>
      </div>

      {/* Bandeau */}
      <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 220 }}>
        {/* Backdrop */}
        <Image
          src={`https://image.tmdb.org/t/p/original${pick.backdrop_path}`}
          alt={title}
          fill
          className="object-cover object-center"
          style={{ filter: 'brightness(0.45)' }}
        />

        {/* Dégradé gauche */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to right, rgba(10,5,6,0.97) 0%, rgba(10,5,6,0.82) 35%, rgba(10,5,6,0.45) 60%, rgba(10,5,6,0.1) 100%)'
        }} />

        {/* Poster flottant à droite */}
        {pick.poster_path && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:block">
            <div className="relative w-24 rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: '2/3' }}>
              <Image
                src={`https://image.tmdb.org/t/p/w342${pick.poster_path}`}
                alt={title}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Contenu texte */}
        <div className="relative z-10 flex flex-col justify-center h-full px-6 md:px-10 py-8" style={{ minHeight: 220 }}>
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white bg-red-600 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
              Sélection du moment
            </span>
          </div>

          {/* Logo / Titre */}
          <div className="mb-3">
            <FeaturedLogo tmdbId={tmdbId} type={type} title={title} />
          </div>

          {/* Méta */}
          <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
            {pick.vote_average > 0 && (
              <span className="flex items-center gap-1 text-yellow-400 font-bold">
                ★ {pick.vote_average.toFixed(1)}
              </span>
            )}
            {year && <span className="text-white/50">🗓 {year}</span>}
            <span className="text-white/40 text-xs font-bold border border-white/20 px-2 py-0.5 rounded-full">{typeLabel}</span>
          </div>

          {/* Synopsis */}
          {pick.overview && (
            <p className="text-white/55 text-sm leading-relaxed mb-5 line-clamp-2 max-w-md">
              {pick.overview}
            </p>
          )}

          {/* Boutons */}
          <div className="flex items-center gap-3">
            <Link href={`/watch/${type}/${tmdbId}?play=1`}>
              <button className="flex items-center gap-2 bg-white hover:bg-white/90 text-black font-bold px-6 py-2.5 rounded-full transition-all shadow-lg text-sm">
                <Play className="w-4 h-4 fill-current" />
                Regarder
              </button>
            </Link>
            <button
              onClick={() => openDrawer(type as 'movie' | 'series', tmdbId)}
              className="flex items-center gap-1.5 text-white/70 hover:text-white font-semibold px-4 py-2.5 rounded-full border border-white/20 hover:border-white/40 transition-all text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
            >
              Détails
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
