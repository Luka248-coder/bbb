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
  const [done, setDone] = useState(false)
  const indexRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startTyping = (t: string) => {
    indexRef.current = 0
    setDone(false)
    setDisplayed('')
    timerRef.current = setInterval(() => {
      if (indexRef.current < t.length) {
        setDisplayed(t.slice(0, indexRef.current + 1))
        indexRef.current++
      } else {
        if (timerRef.current) clearInterval(timerRef.current)
        setDone(true)
        timeoutRef.current = setTimeout(() => startTyping(t), 2500)
      }
    }, 18)
  }

  useEffect(() => {
    startTyping(text)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
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
      {!done && (
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
    <section style={{ padding: '1.25rem 1rem 2rem' }}>

      <style>{`
        @keyframes badgePulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.85); } }
        @keyframes kenBurns { 0% { transform: scale(1.06) translateY(0); } 100% { transform: scale(1.14) translateY(-2%); } }
      `}</style>

      {/* Panneau cinématographique plein cadre, contenu ancré en bas */}
      <div style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        minHeight: '520px',
        display: 'flex',
        background: '#08080a',
        boxShadow: '0 30px 80px -30px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.06)',
      }}>
        {/* Backdrop plein cadre avec léger ken-burns */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <Image
            src={`https://image.tmdb.org/t/p/original${pick.backdrop_path}`}
            alt={title}
            fill
            priority
            className="object-cover object-center"
            style={{ animation: 'kenBurns 18s ease-out infinite alternate' }}
          />
        </div>

        {/* Scrims cinématographiques : bas lourd + gauche + vignette rouge subtile */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,10,0.98) 0%, rgba(8,8,10,0.85) 22%, rgba(8,8,10,0.35) 50%, rgba(8,8,10,0.05) 75%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(8,8,10,0.85) 0%, rgba(8,8,10,0.4) 35%, transparent 65%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 100% 0%, rgba(220,38,38,0.10) 0%, transparent 55%)' }} />

        {/* Kicker "À la une" en haut à gauche, dans la carte */}
        <div style={{ position: 'absolute', top: '22px', left: '28px', zIndex: 4, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'rgba(220,38,38,0.12)',
            border: '1px solid rgba(220,38,38,0.45)',
            color: '#f87171',
            fontSize: '0.62rem', fontWeight: 800,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: '6px 13px 6px 11px', borderRadius: '100px',
            backdropFilter: 'blur(10px)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', animation: 'badgePulse 2s ease-in-out infinite', boxShadow: '0 0 8px rgba(220,38,38,0.9)' }} />
            À la une
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', fontWeight: 500 }}>Notre sélection du moment</span>
        </div>

        {/* Contenu ancré en bas — éditorial */}
        <div style={{
          position: 'relative', zIndex: 4, marginTop: 'auto', width: '100%',
          display: 'flex', flexDirection: 'column',
          padding: 'clamp(1.5rem, 4vw, 3rem)',
          maxWidth: '760px',
        }}>
          {/* Filet rouge + type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <span style={{ width: '34px', height: '2px', background: '#dc2626', borderRadius: '2px' }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em' }}>
              <Clapperboard style={{ width: '11px', height: '11px' }} />
              {typeLabel}
            </span>
          </div>

          {/* Logo / Titre géant */}
          <div style={{ marginBottom: '18px' }}>
            <FeaturedLogo tmdbId={tmdbId} type={type} title={title} />
          </div>

          {/* Méta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {pick.vote_average > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem' }}>
                ★ {pick.vote_average.toFixed(1)}
              </span>
            )}
            {year && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                <Calendar style={{ width: '13px', height: '13px' }} />
                {year}
              </span>
            )}
          </div>

          {/* Synopsis — clean, 2 lignes */}
          {pick.overview && (
            <p style={{
              color: 'rgba(255,255,255,0.62)', fontSize: '0.92rem', lineHeight: 1.65,
              marginBottom: '26px', maxWidth: '540px',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {pick.overview}
            </p>
          )}

          {/* Boutons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link href={`/watch/${type}/${tmdbId}?play=1`}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                background: '#fff', color: '#000',
                fontWeight: 700, fontSize: '0.9rem',
                padding: '13px 30px', borderRadius: '100px',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 10px 36px rgba(0,0,0,0.6)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.5)' }}
              >
                <Play style={{ width: '15px', height: '15px', fill: '#000' }} />
                Regarder
              </button>
            </Link>

            <button
              onClick={() => openDrawer(type as 'movie' | 'series', tmdbId)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)',
                fontWeight: 600, fontSize: '0.9rem',
                padding: '13px 24px', borderRadius: '100px',
                border: '1px solid rgba(255,255,255,0.16)', cursor: 'pointer',
                backdropFilter: 'blur(14px)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.04)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              Plus d&apos;infos
              <ChevronRight style={{ width: '15px', height: '15px' }} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
