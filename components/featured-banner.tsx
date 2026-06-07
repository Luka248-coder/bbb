'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, ChevronRight, Film, Clapperboard, Calendar } from 'lucide-react'
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

  if (!tried) return <div className="h-16 w-56 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />

  if (logoPath) {
    return (
      <Image
        src={`https://image.tmdb.org/t/p/w500${logoPath}`}
        alt={title}
        width={400}
        height={140}
        className="object-contain object-left"
        style={{ maxHeight: '100px', width: 'auto', filter: 'drop-shadow(0 2px 16px rgba(0,0,0,1))' }}
      />
    )
  }

  return (
    <h2
      className="font-black text-white leading-none tracking-tight"
      style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}
    >
      {title}
    </h2>
  )
}

export function FeaturedBanner({ movies, series }: FeaturedBannerProps) {
  const { openDrawer } = useDrawer()

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
    <section style={{ padding: '1.5rem 1rem 1.5rem' }}>
      {/* En-tête section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem', paddingLeft: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem' }}>✦</span>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>À la une</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', paddingLeft: '1.5rem' }}>Notre sélection du moment</span>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', paddingLeft: '1.5rem' }}>
          <div style={{ width: '28px', height: '2px', background: '#e53935', borderRadius: '2px' }} />
          <div style={{ width: '16px', height: '2px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
        </div>
      </div>

      {/* Carte principale */}
      <div style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        height: '300px',
        background: '#111',
      }}>

        {/* Backdrop plein */}
        <Image
          src={`https://image.tmdb.org/t/p/original${pick.backdrop_path}`}
          alt={title}
          fill
          className="object-cover object-center"
          style={{ opacity: 0.55 }}
        />

        {/* Dégradé sombre gauche fort */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(8,4,5,1) 0%, rgba(8,4,5,0.92) 25%, rgba(8,4,5,0.65) 50%, rgba(8,4,5,0.15) 72%, transparent 100%)',
        }} />
        {/* Dégradé bas pour la lisibilité */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(8,4,5,0.7) 0%, transparent 40%)',
        }} />

        {/* Poster flottant droite */}
        {pick.poster_path && (
          <div style={{
            position: 'absolute',
            right: '28px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '130px',
            aspectRatio: '2/3',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
            zIndex: 2,
          }}>
            <Image
              src={`https://image.tmdb.org/t/p/w342${pick.poster_path}`}
              alt={title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Contenu texte */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '2rem 2.5rem',
          maxWidth: '620px',
        }}>

          {/* Badge */}
          <div style={{ marginBottom: '14px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#c62828', color: '#fff',
              fontSize: '0.68rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '5px 12px', borderRadius: '100px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
              Sélection du moment
            </span>
          </div>

          {/* Logo / Titre */}
          <div style={{ marginBottom: '14px' }}>
            <FeaturedLogo tmdbId={tmdbId} type={type} title={title} />
          </div>

          {/* Méta badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {pick.vote_average > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#facc15', fontWeight: 700, fontSize: '0.9rem' }}>
                ★ {pick.vote_average.toFixed(1)}
              </span>
            )}
            {year && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', fontWeight: 500,
              }}>
                <Calendar style={{ width: '13px', height: '13px', opacity: 0.7 }} />
                {year}
              </span>
            )}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.65)', fontSize: '0.72rem', fontWeight: 600,
              padding: '2px 10px', borderRadius: '100px', letterSpacing: '0.05em',
            }}>
              <Clapperboard style={{ width: '11px', height: '11px' }} />
              {typeLabel}
            </span>
          </div>

          {/* Synopsis */}
          {pick.overview && (
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.875rem', lineHeight: 1.65,
              marginBottom: '20px',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              maxWidth: '480px',
            }}>
              {pick.overview}
            </p>
          )}

          {/* Boutons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link href={`/watch/${type}/${tmdbId}?play=1`}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#fff', color: '#000',
                fontWeight: 700, fontSize: '0.88rem',
                padding: '10px 22px', borderRadius: '100px',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.88)')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <Play style={{ width: '15px', height: '15px', fill: '#000' }} />
                Regarder
              </button>
            </Link>

            <button
              onClick={() => openDrawer(type as 'movie' | 'series', tmdbId)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)',
                fontWeight: 600, fontSize: '0.88rem',
                padding: '10px 18px', borderRadius: '100px',
                border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
            >
              Détails
              <ChevronRight style={{ width: '15px', height: '15px' }} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
