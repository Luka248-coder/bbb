'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, ChevronRight, Clapperboard, Calendar, Sparkles } from 'lucide-react'
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

  if (!tried) return <div style={{ height: '80px', width: '220px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', animation: 'pulse 2s infinite' }} />

  if (logoPath) {
    return (
      <Image
        src={`https://image.tmdb.org/t/p/w500${logoPath}`}
        alt={title}
        width={420}
        height={150}
        className="object-contain object-left"
        style={{ maxHeight: '110px', width: 'auto', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,1))' }}
      />
    )
  }

  return (
    <h2 className="font-black text-white leading-none tracking-tight"
      style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}>
      {title}
    </h2>
  )
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    setDisplayed('')
    indexRef.current = 0
    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1))
        indexRef.current++
      } else {
        clearInterval(interval)
      }
    }, 18)
    return () => clearInterval(interval)
  }, [text])

  return (
    <p style={{
      color: 'rgba(255,255,255,0.45)',
      fontSize: '0.855rem', lineHeight: 1.7,
      marginBottom: '24px',
      maxWidth: '460px',
      minHeight: '4.5em',
    }}>
      {displayed}
      {displayed.length < text.length && (
        <span style={{
          display: 'inline-block', width: '2px', height: '0.9em',
          background: 'rgba(255,255,255,0.6)', marginLeft: '2px',
          verticalAlign: 'text-bottom', animation: 'cursorBlink 0.7s step-end infinite',
        }} />
      )}
    </p>
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
    <section style={{ padding: '1.5rem 1rem 2rem' }}>

      {/* Keyframes injectés */}
      <style>{`
        @keyframes posterFloat {
          0%   { transform: rotate(4deg) translateY(-8px); box-shadow: 0 24px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06); }
          50%  { transform: rotate(4deg) translateY(8px);  box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06); }
          100% { transform: rotate(4deg) translateY(-8px); box-shadow: 0 24px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      {/* En-tête */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem', paddingLeft: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '3px', height: '18px', background: '#e53935', borderRadius: '2px' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>À la une</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginLeft: '2px' }}>· Notre sélection du moment</span>
        </div>
      </div>

      {/* Wrapper : position relative pour sortir le poster du overflow:hidden */}
      <div style={{ position: 'relative' }}>

        {/* Carte principale avec overflow hidden */}
        <div style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          height: '420px',
          background: '#0d0d0d',
        }}>
          {/* Backdrop */}
          <Image
            src={`https://image.tmdb.org/t/p/original${pick.backdrop_path}`}
            alt={title}
            fill
            className="object-cover object-center"
            style={{ opacity: 0.5 }}
          />

          {/* Dégradé gauche */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(105deg, rgba(6,3,4,1) 0%, rgba(6,3,4,0.95) 20%, rgba(6,3,4,0.75) 42%, rgba(6,3,4,0.3) 62%, rgba(6,3,4,0.05) 78%, transparent 100%)',
          }} />
          {/* Dégradé bas */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(6,3,4,0.8) 0%, transparent 45%)',
          }} />

          {/* Contenu texte */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 3,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '2.5rem 3rem',
            maxWidth: '600px',
          }}>

            {/* Badge "Sélection du moment" — moderne */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                background: 'rgba(220, 38, 38, 0.15)',
                border: '1px solid rgba(220, 38, 38, 0.55)',
                color: '#f87171',
                fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                padding: '5px 13px 5px 10px', borderRadius: '100px',
                backdropFilter: 'blur(8px)',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#ef4444', display: 'inline-block',
                  animation: 'badgePulse 2s ease-in-out infinite',
                  boxShadow: '0 0 6px rgba(239,68,68,0.8)',
                }} />
                Sélection du moment
              </span>
            </div>

            {/* Logo / Titre */}
            <div style={{ marginBottom: '16px' }}>
              <FeaturedLogo tmdbId={tmdbId} type={type} title={title} />
            </div>

            {/* Méta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {pick.vote_average > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: 700, fontSize: '0.88rem' }}>
                  ★ {pick.vote_average.toFixed(1)}
                </span>
              )}
              {year && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem' }}>
                  <Calendar style={{ width: '12px', height: '12px' }} />
                  {year}
                </span>
              )}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', fontWeight: 600,
                padding: '3px 10px', borderRadius: '100px', letterSpacing: '0.07em',
                background: 'rgba(255,255,255,0.04)',
              }}>
                <Clapperboard style={{ width: '10px', height: '10px' }} />
                {typeLabel}
              </span>
            </div>

            {/* Synopsis animé */}
            {pick.overview && <TypewriterText text={pick.overview.slice(0, 180) + (pick.overview.length > 180 ? '...' : '')} />}

            {/* Boutons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link href={`/watch/${type}/${tmdbId}?play=1`}>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#fff', color: '#000',
                  fontWeight: 700, fontSize: '0.875rem',
                  padding: '11px 24px', borderRadius: '100px',
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                  transition: 'transform 0.15s, background 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.transform = 'scale(1.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <Play style={{ width: '14px', height: '14px', fill: '#000' }} />
                  Regarder
                </button>
              </Link>

              <button
                onClick={() => openDrawer(type as 'movie' | 'series', tmdbId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)',
                  fontWeight: 600, fontSize: '0.875rem',
                  padding: '11px 20px', borderRadius: '100px',
                  border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.03)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.transform = 'scale(1)' }}
              >
                Détails
                <ChevronRight style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Poster HORS du overflow:hidden — animation libre */}
        {pick.poster_path && (
          <div style={{
            position: 'absolute',
            right: '40px',
            top: '50%',
            width: '155px',
            aspectRatio: '2/3',
            borderRadius: '14px',
            overflow: 'hidden',
            zIndex: 10,
            animation: 'posterFloat 5s ease-in-out infinite',
            transformOrigin: 'center center',
          }}>
            <Image
              src={`https://image.tmdb.org/t/p/w342${pick.poster_path}`}
              alt={title}
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>
    </section>
  )
}
