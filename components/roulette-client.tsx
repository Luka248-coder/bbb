'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Shuffle, Play, Star } from 'lucide-react'
import { GENRES, getPosterUrl } from '@/lib/content-types'

// ── Confetti ──────────────────────────────────────────────────────────────────
const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#ffffff']

interface Particle {
  id: number; x: number; vx: number; vy: number
  color: string; size: number; rotation: number; rotSpeed: number
  shape: 'rect' | 'circle' | 'strip'
}

function useConfetti() {
  const [particles, setParticles] = React.useState<Particle[]>([])
  const idRef = React.useRef(0)
  const fire = () => {
    const burst: Particle[] = []
    const make = (fromRight: boolean, count: number, spread: number) => {
      for (let i = 0; i < count; i++) {
        const angle = fromRight
          ? Math.PI * (0.25 + Math.random() * 0.5)   // 45°–135° leftward arc
          : Math.PI * (0.25 + Math.random() * 0.5)   // same arc rightward
        const speed = 28 + Math.random() * 55
        burst.push({
          id: idRef.current++,
          x: fromRight ? 98 + Math.random() * 2 : Math.random() * 2,
          vx: fromRight ? -(speed * Math.cos(angle)) : speed * Math.cos(angle),
          vy: -(speed * Math.sin(angle) * 1.4),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 5 + Math.random() * 10,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 1200,
          shape: (['rect','circle','strip'] as const)[Math.floor(Math.random() * 3)],
        })
      }
    }
    // Main cannons
    make(false, 80, 60)
    make(true, 80, 60)
    // Center rain — sprinkle from top center
    for (let i = 0; i < 60; i++) {
      burst.push({
        id: idRef.current++,
        x: 30 + Math.random() * 40,
        vx: (Math.random() - 0.5) * 20,
        vy: -(20 + Math.random() * 30),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 5 + Math.random() * 8,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 800,
        shape: (['rect','circle','strip'] as const)[Math.floor(Math.random() * 3)],
      })
    }
    setParticles(burst)
    setTimeout(() => setParticles([]), 4500)
  }
  return { particles, fire }
}

function ConfettiLayer({ particles }: { particles: Particle[] }) {
  if (!particles.length) return null
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: p.vy < -25 ? '100vh' : '-5vh', rotate: p.rotation, opacity: 1 }}
          animate={{
            x: `calc(${p.x}vw + ${p.vx * 9}vw)`,
            y: p.vy < -25 ? `calc(100vh + ${p.vy * 18}px)` : `110vh`,
            rotate: p.rotation + p.rotSpeed,
            opacity: [1, 1, 1, 0.6, 0],
          }}
          transition={{
            duration: 2.8 + Math.random() * 1.2,
            ease: [0.05, 0.7, 0.95, 1],
            opacity: { duration: 3.5 + Math.random() },
          }}
          style={{
            position: 'absolute',
            bottom: p.vy < -25 ? 0 : undefined,
            top: p.vy >= -25 ? 0 : undefined,
            width: p.shape === 'strip' ? p.size / 2 : p.size,
            height: p.shape === 'strip' ? p.size * 4 : p.shape === 'circle' ? p.size : p.size * 0.6,
            background: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'strip' ? '2px' : '1px',
            boxShadow: `0 0 ${p.size}px ${p.color}66`,
          }}
        />
      ))}
    </div>
  )
}

function usePopSound() {
  return () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const master = ctx.createGain()
      master.gain.value = 0.7
      master.connect(ctx.destination)

      // Fanfare: C major arpeggio + sparkle
      const notes = [
        { freq: 523.25, t: 0,    dur: 0.35, type: 'triangle' as OscillatorType, vol: 0.5 },  // C5
        { freq: 659.25, t: 0.08, dur: 0.30, type: 'triangle' as OscillatorType, vol: 0.45 }, // E5
        { freq: 783.99, t: 0.16, dur: 0.30, type: 'triangle' as OscillatorType, vol: 0.4 },  // G5
        { freq: 1046.5, t: 0.24, dur: 0.5,  type: 'sine'     as OscillatorType, vol: 0.5 },  // C6
        { freq: 1318.5, t: 0.28, dur: 0.5,  type: 'sine'     as OscillatorType, vol: 0.35 }, // E6
        // sparkle high notes
        { freq: 2093,   t: 0.32, dur: 0.2,  type: 'sine'     as OscillatorType, vol: 0.15 },
        { freq: 2637,   t: 0.38, dur: 0.18, type: 'sine'     as OscillatorType, vol: 0.12 },
      ]

      notes.forEach(({ freq, t, dur, type, vol }) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(master)
        osc.type = type
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, ctx.currentTime + t)
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + t + 0.015)
        gain.gain.setValueAtTime(vol, ctx.currentTime + t + dur * 0.6)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur)
        osc.start(ctx.currentTime + t)
        osc.stop(ctx.currentTime + t + dur + 0.05)
      })

      // Percussive pop noise burst
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      const noiseGain = ctx.createGain()
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.value = 800
      noiseFilter.Q.value = 0.8
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(master)
      noiseGain.gain.setValueAtTime(0.4, ctx.currentTime)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      noise.start(ctx.currentTime)
    } catch {}
  }
}


interface ContentItem {
  id: number
  tmdb_id: number
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  genre_ids: number[]
  type: 'movie' | 'series'
}

const COMMON_GENRES = [28, 35, 18, 27, 878, 10749, 16, 53, 12, 80, 14, 99]

interface Props { userId: string | null }

export function RouletteClient({ userId }: Props) {
  const [allContent, setAllContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<ContentItem | null>(null)
  const [flash, setFlash] = useState<ContentItem | null>(null)

  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all')
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [minRating, setMinRating] = useState(0)

  const slotRef = useRef<NodeJS.Timeout | null>(null)
  const { particles, fire: fireConfetti } = useConfetti()
  const playPop = usePopSound()

  useEffect(() => { fetchContent() }, [])

  const fetchContent = async () => {
    try {
      const [mr, sr] = await Promise.all([fetch('/api/content/movies'), fetch('/api/content/series')])
      const movies = await mr.json()
      const series = await sr.json()
      setAllContent([
        ...(Array.isArray(movies) ? movies : []).map((m: any) => ({ ...m, type: 'movie' as const })),
        ...(Array.isArray(series) ? series : []).map((s: any) => ({ ...s, type: 'series' as const })),
      ])
    } catch {}
    setLoading(false)
  }

  const getFiltered = () => allContent.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false
    if (item.vote_average < minRating) return false
    if (selectedGenres.length > 0 && !selectedGenres.some(g => item.genre_ids?.includes(g))) return false
    return true
  })

  const spin = () => {
    const pool = getFiltered()
    if (!pool.length) return
    setSpinning(true)
    setResult(null)
    let count = 0
    const total = 14
    const picked = pool[Math.floor(Math.random() * pool.length)]
    const tick = () => {
      count++
      setFlash(pool[Math.floor(Math.random() * pool.length)])
      const delay = count < 8 ? 60 : count < 12 ? 120 : 200
      if (count < total) {
        slotRef.current = setTimeout(tick, delay)
      } else {
        setFlash(null)
        setResult(picked)
        setSpinning(false)
        setTimeout(() => { fireConfetti(); playPop() }, 50)
      }
    }
    tick()
  }

  const t = (item: ContentItem) => item.title || item.name || '?'
  const yr = (item: ContentItem) => {
    const d = item.release_date || item.first_air_date
    return d ? new Date(d).getFullYear() : null
  }
  const gs = (item: ContentItem) => (item.genre_ids || []).map(id => GENRES[id]).filter(Boolean).slice(0, 2)
  const count = getFiltered().length
  const displayItem = flash || result

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#0a0a0a 0%,#0d0d0d 100%)' }}>
      <div className="max-w-5xl mx-auto px-6 py-16">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
          <p className="text-zinc-600 text-xs uppercase tracking-[0.2em] font-medium mb-2">Découverte</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Roulette</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 items-start">

          {/* Zone résultat — gauche */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <AnimatePresence mode="wait">
              {!result && !spinning ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="w-full aspect-[16/9] rounded-2xl border border-white/5 flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full border border-white/8 flex items-center justify-center mx-auto mb-3">
                        <Shuffle className="w-5 h-5 text-zinc-700" />
                      </div>
                      <p className="text-zinc-700 text-sm">Lance la roulette pour découvrir quelque chose</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden" style={{ background: '#111' }}>
                    <AnimatePresence mode="wait">
                      {displayItem?.backdrop_path && (
                        <motion.div key={displayItem.id + displayItem.type}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: spinning ? 0.05 : 0.5 }}
                          className="absolute inset-0">
                          <Image
                            src={`https://image.tmdb.org/t/p/w1280${displayItem.backdrop_path}`}
                            alt="" fill className="object-cover"
                            style={{ filter: spinning ? 'brightness(0.2)' : 'brightness(0.22)' }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />

                    <div className="absolute inset-0 flex items-end p-7">
                      <div className="flex items-end gap-5 w-full">
                        {result && !spinning && result.poster_path && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="relative w-[72px] aspect-[2/3] rounded-xl overflow-hidden flex-shrink-0 shadow-2xl border border-white/10">
                            <Image src={getPosterUrl(result.poster_path)} alt={t(result)} fill className="object-cover" sizes="72px" />
                          </motion.div>
                        )}

                        <div className="flex-1 min-w-0">
                          {spinning ? (
                            <motion.p key={flash?.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className="text-white/30 text-xl font-semibold truncate">
                              {flash ? t(flash) : ''}
                            </motion.p>
                          ) : result ? (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                                  style={{ background: result.type === 'movie' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: result.type === 'movie' ? '#f87171' : '#60a5fa' }}>
                                  {result.type === 'movie' ? 'Film' : 'Série'}
                                </span>
                                {yr(result) && <span className="text-zinc-500 text-xs">{yr(result)}</span>}
                                {result.vote_average > 0 && (
                                  <span className="text-zinc-400 text-xs flex items-center gap-1">
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />{result.vote_average.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              <h2 className="text-white text-2xl font-bold leading-tight mb-2 truncate">{t(result)}</h2>
                              {gs(result).length > 0 && (
                                <div className="flex gap-1.5">
                                  {gs(result).map(g => (
                                    <span key={g} className="text-[11px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-md">{g}</span>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          ) : null}
                        </div>

                        {result && !spinning && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex-shrink-0">
                            <Link href={`/watch/${result.type}/${result.tmdb_id}`}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors">
                              <Play className="w-3.5 h-3.5 fill-white" />
                              Regarder
                            </Link>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {result && !spinning && result.overview && (
                    <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                      className="text-zinc-600 text-sm leading-relaxed mt-4 line-clamp-2">
                      {result.overview}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Filtres + bouton — droite */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-7">

            {/* Type */}
            <div>
              <p className="text-zinc-600 text-[11px] uppercase tracking-widest mb-3">Type</p>
              <div className="flex gap-2">
                {([['all', 'Tout'], ['movie', 'Films'], ['series', 'Séries']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setTypeFilter(val)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: typeFilter === val ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)',
                      color: typeFilter === val ? '#fff' : '#52525b',
                      border: `1px solid ${typeFilter === val ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-zinc-600 text-[11px] uppercase tracking-widest">Note min.</p>
                <span className="text-zinc-400 text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  {minRating > 0 ? minRating.toFixed(1) : '—'}
                </span>
              </div>
              <input type="range" min={0} max={9} step={0.5} value={minRating}
                onChange={e => setMinRating(parseFloat(e.target.value))}
                className="w-full h-px rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right,#ef4444 ${minRating / 9 * 100}%,rgba(255,255,255,0.08) ${minRating / 9 * 100}%)` }}
              />
            </div>

            {/* Genres */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-zinc-600 text-[11px] uppercase tracking-widest">Genres</p>
                {selectedGenres.length > 0 && (
                  <button onClick={() => setSelectedGenres([])} className="text-zinc-600 text-[11px] hover:text-zinc-400 transition-colors">Effacer</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_GENRES.map(id => (
                  <button key={id}
                    onClick={() => setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                    style={{
                      background: selectedGenres.includes(id) ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
                      color: selectedGenres.includes(id) ? '#f87171' : '#52525b',
                      border: `1px solid ${selectedGenres.includes(id) ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    {GENRES[id]}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5 pt-1">
              <p className="text-zinc-700 text-xs mb-3 text-right">
                {loading ? '…' : `${count} titre${count > 1 ? 's' : ''}`}
              </p>
              <button onClick={spin} disabled={spinning || loading || count === 0}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: spinning || count === 0 ? 'rgba(255,255,255,0.04)' : '#dc2626',
                  color: spinning || count === 0 ? '#3f3f46' : '#fff',
                  cursor: spinning || count === 0 ? 'not-allowed' : 'pointer',
                }}>
                <motion.div animate={spinning ? { rotate: 360 } : {}} transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}>
                  <Shuffle className="w-4 h-4" />
                </motion.div>
                {spinning ? 'Tirage…' : result ? 'Relancer' : 'Lancer'}
              </button>
              {count === 0 && !loading && (
                <p className="text-red-500/40 text-xs text-center mt-2">Aucun contenu pour ces filtres</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <ConfettiLayer particles={particles} />

      <style jsx global>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance:none; width:13px; height:13px;
          border-radius:50%; background:#ef4444; cursor:pointer;
          border:2px solid #0a0a0a; box-shadow:0 0 6px rgba(239,68,68,0.4);
        }
        input[type='range']::-moz-range-thumb {
          width:13px; height:13px; border-radius:50%;
          background:#ef4444; cursor:pointer; border:2px solid #0a0a0a;
        }
      `}</style>
    </div>
  )
}