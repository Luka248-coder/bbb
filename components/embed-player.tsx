'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, SkipBack, SkipForward, Cast,
  Film, Loader2, List, X, ChevronDown, ChevronUp, Settings
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Episode {
  id: number
  season_number: number
  episode_number: number
  title: string | null
  overview: string | null
  still_path: string | null
  air_date: string | null
  video_url: string | null
  runtime?: number
}

interface EmbedPlayerProps {
  videoUrl: string | null
  title: string
  type?: 'movie' | 'series'
  tmdbId?: number
  seriesDbId?: number
  currentSeason?: number
  currentEpisode?: number
}

// Reuse episodes panel from native-player logic inline
function EpisodesPanel({
  seriesDbId, tmdbId, currentSeason, currentEpisode, onClose, onSelectEpisode,
}: {
  seriesDbId: number; tmdbId: number; currentSeason: number; currentEpisode: number
  onClose: () => void
  onSelectEpisode: (season: number, episode: number, url: string, title: string) => void
}) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(currentSeason)
  const [showSeasonPicker, setShowSeasonPicker] = useState(false)

  useEffect(() => {
    fetch(`/api/auth/admin/episodes?seriesId=${seriesDbId}`)
      .then(r => r.json())
      .then((data: Episode[]) => { setEpisodes(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [seriesDbId])

  const seasons = [...new Set(episodes.map(e => e.season_number))].sort((a, b) => a - b)
  const filteredEps = episodes.filter(e => e.season_number === selectedSeason)

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute inset-y-0 right-0 w-full sm:w-96 bg-zinc-950/95 backdrop-blur-xl flex flex-col z-50 border-l border-white/5"
      onClick={e => e.stopPropagation()}>
      <div className="px-5 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
            <List className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-white font-bold text-lg">Épisodes</h2>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-white/5">
        <button onClick={() => setShowSeasonPicker(!showSeasonPicker)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/10">
          <span className="text-white/60 text-sm">Saison</span>
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-lg">{selectedSeason}</span>
            {showSeasonPicker ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </div>
        </button>
        <AnimatePresence>
          {showSeasonPicker && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-2 bg-zinc-900 rounded-2xl border border-white/10">
              {seasons.map(s => (
                <button key={s} onClick={() => { setSelectedSeason(s); setShowSeasonPicker(false) }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors ${s === selectedSeason ? 'text-primary' : 'text-white'}`}>
                  <span className="font-semibold">Saison {s}</span>
                  <span className={`text-sm ${s === selectedSeason ? 'text-primary font-bold' : 'text-white/40'}`}>
                    {episodes.filter(e => e.season_number === s).length} ép.
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
          filteredEps.map(ep => {
            const isCurrent = ep.season_number === currentSeason && ep.episode_number === currentEpisode
            const hasVideo = !!ep.video_url
            return (
              <button key={ep.id} onClick={() => hasVideo && onSelectEpisode(ep.season_number, ep.episode_number, ep.video_url!, ep.title || `Épisode ${ep.episode_number}`)}
                disabled={!hasVideo}
                className={`w-full flex gap-3 px-4 py-3 text-left transition-all border-l-2 ${isCurrent ? 'bg-primary/10 border-primary' : 'hover:bg-white/5 border-transparent'} ${!hasVideo ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                  {ep.still_path ? <Image src={`https://image.tmdb.org/t/p/w185${ep.still_path}`} alt="" fill className="object-cover" sizes="96px" /> :
                    <div className="w-full h-full flex items-center justify-center"><Film className="w-5 h-5 text-white/20" /></div>}
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">E{ep.episode_number}</div>
                  {isCurrent && <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                    </div>
                  </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isCurrent ? 'text-primary' : 'text-white'}`}>{ep.title || `Épisode ${ep.episode_number}`}</p>
                  {ep.overview && <p className="text-white/40 text-xs line-clamp-2 mt-0.5">{ep.overview}</p>}
                  {isCurrent && <span className="inline-flex items-center gap-1 text-primary text-xs font-medium mt-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />EN COURS</span>}
                </div>
              </button>
            )
          })}
      </div>
    </motion.div>
  )
}

export function EmbedPlayer({
  videoUrl: initialVideoUrl, title: initialTitle,
  type = 'movie', tmdbId, seriesDbId,
  currentSeason: initialSeason = 1, currentEpisode: initialEpisode = 1,
}: EmbedPlayerProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  const [videoUrl, setVideoUrl] = useState(initialVideoUrl)
  const [title, setTitle] = useState(initialTitle)
  const [currentSeason, setCurrentSeason] = useState(initialSeason)
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode)
  const [showEpisodes, setShowEpisodes] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [buffering, setBuffering] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showVol, setShowVol] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'audio' | 'subtitles'>('audio')
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [subtitle, setSubtitle] = useState<'off' | 'fr' | 'en'>('off')

  const fmt = (s: number) => {
    if (isNaN(s)) return '0:00'
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
  }

  const resetTimer = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3500)
  }, [])

  useEffect(() => {
    const v = videoRef.current; if (!v) return
    v.addEventListener('timeupdate', () => setCurrentTime(v.currentTime))
    v.addEventListener('loadedmetadata', () => { setDuration(v.duration); v.play() })
    v.addEventListener('play', () => { setPlaying(true); resetTimer() })
    v.addEventListener('pause', () => { setPlaying(false); setShowControls(true) })
    v.addEventListener('waiting', () => setBuffering(true))
    v.addEventListener('canplay', () => { setBuffering(false); setInitialLoading(false) })
    v.addEventListener('progress', () => { if (v.buffered.length > 0) setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100) })
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [resetTimer])

  useEffect(() => {
    document.addEventListener('fullscreenchange', () => setFullscreen(!!document.fullscreenElement))
  }, [])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (showEpisodes) return
      if (e.code === 'Space') { e.preventDefault(); togglePlay() }
      if (e.code === 'ArrowLeft') skip(-10)
      if (e.code === 'ArrowRight') skip(10)
      if (e.code === 'KeyF') toggleFs()
      if (e.code === 'KeyM') toggleMute()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [playing, showEpisodes])

  const togglePlay = () => { const v = videoRef.current; if (v) v.paused ? v.play() : v.pause() }
  const skip = (s: number) => { const v = videoRef.current; if (v) { v.currentTime = Math.max(0, Math.min(duration, v.currentTime + s)); resetTimer() } }
  const toggleMute = () => { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted) } }
  const changeVolume = (val: number) => { const v = videoRef.current; if (!v) return; v.volume = val; setVolume(val); setMuted(val === 0) }
  const toggleFs = () => {
    const el = containerRef.current, v = videoRef.current; if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen()
    else if (v && (v as any).webkitEnterFullscreen) (v as any).webkitEnterFullscreen()
    else el.requestFullscreen()
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current, bar = progressRef.current; if (!v || !bar) return
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth)) * duration; resetTimer()
  }
  const onProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current; if (!bar) return
    setHoverTime(Math.max(0, Math.min(1, (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth)) * duration)
    setHoverX(e.clientX - bar.getBoundingClientRect().left)
  }

  const handleSelectEpisode = (season: number, episode: number, url: string, epTitle: string) => {
    setCurrentSeason(season); setCurrentEpisode(episode); setVideoUrl(url); setTitle(epTitle)
    setShowEpisodes(false); setBuffering(true); setInitialLoading(true)
    const v = videoRef.current; if (v) { v.src = url; v.play() }
    router.replace(`/embed/series/${tmdbId}?season=${season}&episode=${episode}`, { scroll: false })
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  if (!videoUrl) {
    return (
      <div className="w-screen bg-[#080808] flex flex-col items-center justify-center relative overflow-hidden" style={{ height: '100dvh' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.12) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          <div className="relative flex items-center justify-center mb-2">
            <div className="absolute w-32 h-32 rounded-full border border-red-500/10 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute w-24 h-24 rounded-full border border-red-500/15" />
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Film className="w-9 h-9 text-zinc-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-white font-bold text-2xl tracking-tight">Contenu non disponible</h2>
            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
              Ce contenu n'a pas encore été ajouté par l'administrateur. Revenez plus tard.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-screen bg-black relative overflow-hidden" style={{ height: '100dvh' }}
      onMouseMove={resetTimer} onMouseLeave={() => playing && !showEpisodes && setShowControls(false)}>
      <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" playsInline onClick={togglePlay} />

      {/* STREAMSELF cinematic loading overlay */}
      <AnimatePresence>
        {initialLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'radial-gradient(ellipse at 70% 60%, rgba(160,10,10,0.35) 0%, rgba(20,5,5,0.7) 45%, #0a0404 100%)' }}
          >

            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute w-20 h-20 rounded-full"
                style={{ border: '2px solid rgba(255,255,255,0.06)' }} />
              <motion.div
                className="absolute w-20 h-20 rounded-full"
                style={{
                  border: '2px solid transparent',
                  borderTopColor: '#cc0a0a',
                  borderRightColor: 'rgba(180,10,10,0.4)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute w-[5px] h-[5px] rounded-full"
                style={{ background: '#e50914', top: '2px', left: '50%', marginLeft: '-2.5px', boxShadow: '0 0 6px 2px rgba(229,9,20,0.7)' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              />
              <div className="w-14 h-14 rounded-full" style={{ background: 'rgba(8,2,2,0.85)' }} />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-white/80 text-sm font-bold tracking-[0.25em] uppercase select-none"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
            >
              STREAMSELF PRÉPARE VOTRE FILM...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {buffering && !initialLoading && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {!playing && !buffering && <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-24 h-24 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
            <Play className="w-11 h-11 text-white fill-white ml-1.5" />
          </div>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-between pointer-events-none">

            {/* Top bar — Logo + title + episodes button (NO back button) */}
            <div className="pointer-events-auto px-6 pt-5 pb-16 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center gap-4">
              <h1 className="text-white font-semibold text-base truncate drop-shadow-lg flex-1">{title}</h1>

              {/* Episodes button */}
              {type === 'series' && seriesDbId && (
                <button onClick={() => setShowEpisodes(true)}
                  className="flex items-center gap-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl transition-all border border-white/10 shrink-0">
                  <List className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Épisodes</span>
                </button>
              )}

              {/* Logo top right — pas de lien */}
              <div className="shrink-0">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT_Image_27_avr._2026_a%CC%80_00_48_07-removebg-preview-q9gJZZAURjXxiGLwtVf8BsKdJaOxq9.png"
                  alt="StreamSelf"
                  width={100}
                  height={30}
                  className="h-7 w-auto opacity-70"
                />
              </div>
            </div>

            {/* Bottom controls — identical to NativePlayer */}
            <div className="pointer-events-auto px-6 pb-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              <p className="text-white/50 text-xs font-medium mb-2 truncate">{title}</p>
              <div ref={progressRef} className="relative w-full cursor-pointer group/bar mb-4" style={{ height: '4px' }} onClick={seek}
                onMouseMove={onProgressHover} onMouseLeave={() => setHoverTime(null)}
                onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.height = '6px' }}
                onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.height = '4px' }}>
                <div className="absolute inset-0 bg-white/20 rounded-full" />
                <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${buffered}%` }} />
                <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 scale-0 group-hover/bar:scale-100 transition-all" />
                </div>
                {hoverTime !== null && (
                  <div className="absolute -top-8 bg-black/80 text-white text-xs px-2 py-1 rounded-lg pointer-events-none -translate-x-1/2 whitespace-nowrap" style={{ left: hoverX }}>{fmt(hoverTime)}</div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => skip(-10)} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all"><SkipBack className="w-5 h-5" /></button>
                <button onClick={togglePlay} className="text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                  {playing ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-0.5" />}
                </button>
                <button onClick={() => skip(10)} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all"><SkipForward className="w-5 h-5" /></button>
                <div className="flex items-center gap-1 ml-1" onMouseEnter={() => setShowVol(true)} onMouseLeave={() => setShowVol(false)}>
                  <button onClick={toggleMute} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                    {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <AnimatePresence>
                    {showVol && <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 80, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden">
                      <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={e => changeVolume(+e.target.value)} className="w-20 accent-primary cursor-pointer" />
                    </motion.div>}
                  </AnimatePresence>
                </div>
                <span className="text-white/50 text-sm font-mono ml-2 tabular-nums">{fmt(currentTime)} / {fmt(duration)}</span>
                <div className="flex-1" />
                <button onClick={toggleFs} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                  {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEpisodes && seriesDbId && tmdbId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black z-40" onClick={() => setShowEpisodes(false)} />
            <EpisodesPanel
              seriesDbId={seriesDbId} tmdbId={tmdbId}
              currentSeason={currentSeason} currentEpisode={currentEpisode}
              onClose={() => setShowEpisodes(false)}
              onSelectEpisode={handleSelectEpisode}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}  seriesDbId, tmdbId, currentSeason, currentEpisode, onClose, onSelectEpisode,
}: {
  seriesDbId: number; tmdbId: number; currentSeason: number; currentEpisode: number
  onClose: () => void
  onSelectEpisode: (season: number, episode: number, url: string, title: string) => void
}) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(currentSeason)
  const [showSeasonPicker, setShowSeasonPicker] = useState(false)

  useEffect(() => {
    fetch(`/api/auth/admin/episodes?seriesId=${seriesDbId}`)
      .then(r => r.json())
      .then((data: Episode[]) => { setEpisodes(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [seriesDbId])

  const seasons = [...new Set(episodes.map(e => e.season_number))].sort((a, b) => a - b)
  const filteredEps = episodes.filter(e => e.season_number === selectedSeason)

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute inset-y-0 right-0 w-full sm:w-96 bg-zinc-950/95 backdrop-blur-xl flex flex-col z-50 border-l border-white/5"
      onClick={e => e.stopPropagation()}>
      <div className="px-5 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
            <List className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-white font-bold text-lg">Épisodes</h2>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-white/5">
        <button onClick={() => setShowSeasonPicker(!showSeasonPicker)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/10">
          <span className="text-white/60 text-sm">Saison</span>
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-lg">{selectedSeason}</span>
            {showSeasonPicker ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </div>
        </button>
        <AnimatePresence>
          {showSeasonPicker && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-2 bg-zinc-900 rounded-2xl border border-white/10">
              {seasons.map(s => (
                <button key={s} onClick={() => { setSelectedSeason(s); setShowSeasonPicker(false) }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors ${s === selectedSeason ? 'text-primary' : 'text-white'}`}>
                  <span className="font-semibold">Saison {s}</span>
                  <span className={`text-sm ${s === selectedSeason ? 'text-primary font-bold' : 'text-white/40'}`}>
                    {episodes.filter(e => e.season_number === s).length} ép.
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
          filteredEps.map(ep => {
            const isCurrent = ep.season_number === currentSeason && ep.episode_number === currentEpisode
            const hasVideo = !!ep.video_url
            return (
              <button key={ep.id} onClick={() => hasVideo && onSelectEpisode(ep.season_number, ep.episode_number, ep.video_url!, ep.title || `Épisode ${ep.episode_number}`)}
                disabled={!hasVideo}
                className={`w-full flex gap-3 px-4 py-3 text-left transition-all border-l-2 ${isCurrent ? 'bg-primary/10 border-primary' : 'hover:bg-white/5 border-transparent'} ${!hasVideo ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                  {ep.still_path ? <Image src={`https://image.tmdb.org/t/p/w185${ep.still_path}`} alt="" fill className="object-cover" sizes="96px" /> :
                    <div className="w-full h-full flex items-center justify-center"><Film className="w-5 h-5 text-white/20" /></div>}
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">E{ep.episode_number}</div>
                  {isCurrent && <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                    </div>
                  </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isCurrent ? 'text-primary' : 'text-white'}`}>{ep.title || `Épisode ${ep.episode_number}`}</p>
                  {ep.overview && <p className="text-white/40 text-xs line-clamp-2 mt-0.5">{ep.overview}</p>}
                  {isCurrent && <span className="inline-flex items-center gap-1 text-primary text-xs font-medium mt-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />EN COURS</span>}
                </div>
              </button>
            )
          })}
      </div>
    </motion.div>
  )
}

export function EmbedPlayer({
  videoUrl: initialVideoUrl, title: initialTitle,
  type = 'movie', tmdbId, seriesDbId,
  currentSeason: initialSeason = 1, currentEpisode: initialEpisode = 1,
}: EmbedPlayerProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  const [videoUrl, setVideoUrl] = useState(initialVideoUrl)
  const [title, setTitle] = useState(initialTitle)
  const [currentSeason, setCurrentSeason] = useState(initialSeason)
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode)
  const [showEpisodes, setShowEpisodes] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [buffering, setBuffering] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showVol, setShowVol] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'audio' | 'subtitles'>('audio')
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [subtitle, setSubtitle] = useState<'off' | 'fr' | 'en'>('off')

  const fmt = (s: number) => {
    if (isNaN(s)) return '0:00'
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
  }

  const resetTimer = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3500)
  }, [])

  useEffect(() => {
    const v = videoRef.current; if (!v) return
    v.addEventListener('timeupdate', () => setCurrentTime(v.currentTime))
    v.addEventListener('loadedmetadata', () => { setDuration(v.duration); v.play() })
    v.addEventListener('play', () => { setPlaying(true); resetTimer() })
    v.addEventListener('pause', () => { setPlaying(false); setShowControls(true) })
    v.addEventListener('waiting', () => setBuffering(true))
    v.addEventListener('canplay', () => { setBuffering(false); setInitialLoading(false) })
    v.addEventListener('progress', () => { if (v.buffered.length > 0) setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100) })
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [resetTimer])

  useEffect(() => {
    document.addEventListener('fullscreenchange', () => setFullscreen(!!document.fullscreenElement))
  }, [])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (showEpisodes) return
      if (e.code === 'Space') { e.preventDefault(); togglePlay() }
      if (e.code === 'ArrowLeft') skip(-10)
      if (e.code === 'ArrowRight') skip(10)
      if (e.code === 'KeyF') toggleFs()
      if (e.code === 'KeyM') toggleMute()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [playing, showEpisodes])

  const togglePlay = () => { const v = videoRef.current; if (v) v.paused ? v.play() : v.pause() }
  const skip = (s: number) => { const v = videoRef.current; if (v) { v.currentTime = Math.max(0, Math.min(duration, v.currentTime + s)); resetTimer() } }
  const toggleMute = () => { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted) } }
  const changeVolume = (val: number) => { const v = videoRef.current; if (!v) return; v.volume = val; setVolume(val); setMuted(val === 0) }
  const toggleFs = () => {
    const el = containerRef.current, v = videoRef.current; if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen()
    else if (v && (v as any).webkitEnterFullscreen) (v as any).webkitEnterFullscreen()
    else el.requestFullscreen()
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current, bar = progressRef.current; if (!v || !bar) return
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth)) * duration; resetTimer()
  }
  const onProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current; if (!bar) return
    setHoverTime(Math.max(0, Math.min(1, (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth)) * duration)
    setHoverX(e.clientX - bar.getBoundingClientRect().left)
  }

  const handleSelectEpisode = (season: number, episode: number, url: string, epTitle: string) => {
    setCurrentSeason(season); setCurrentEpisode(episode); setVideoUrl(url); setTitle(epTitle)
    setShowEpisodes(false); setBuffering(true); setInitialLoading(true)
    const v = videoRef.current; if (v) { v.src = url; v.play() }
    router.replace(`/embed/series/${tmdbId}?season=${season}&episode=${episode}`, { scroll: false })
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  if (!videoUrl) {
    return (
      <div className="w-screen bg-[#080808] flex flex-col items-center justify-center relative overflow-hidden" style={{ height: '100dvh' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.12) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          <div className="relative flex items-center justify-center mb-2">
            <div className="absolute w-32 h-32 rounded-full border border-red-500/10 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute w-24 h-24 rounded-full border border-red-500/15" />
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Film className="w-9 h-9 text-zinc-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-white font-bold text-2xl tracking-tight">Contenu non disponible</h2>
            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
              Ce contenu n'a pas encore été ajouté par l'administrateur. Revenez plus tard.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-screen bg-black relative overflow-hidden" style={{ height: '100dvh' }}
      onMouseMove={resetTimer} onMouseLeave={() => playing && !showEpisodes && setShowControls(false)}>
      <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" playsInline onClick={togglePlay} />

      {/* STREAMSELF cinematic loading overlay */}
      <AnimatePresence>
        {initialLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'radial-gradient(ellipse at 70% 60%, rgba(160,10,10,0.35) 0%, rgba(20,5,5,0.7) 45%, #0a0404 100%)' }}
          >
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")', backgroundSize: '128px 128px' }} />
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute w-20 h-20 rounded-full"
                style={{ border: '2px solid rgba(255,255,255,0.06)' }} />
              <motion.div
                className="absolute w-20 h-20 rounded-full"
                style={{
                  border: '2px solid transparent',
                  borderTopColor: '#cc0a0a',
                  borderRightColor: 'rgba(180,10,10,0.4)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute w-[5px] h-[5px] rounded-full"
                style={{ background: '#e50914', top: '2px', left: '50%', marginLeft: '-2.5px', boxShadow: '0 0 6px 2px rgba(229,9,20,0.7)' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              />
              <div className="w-14 h-14 rounded-full" style={{ background: 'rgba(8,2,2,0.85)' }} />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-white/80 text-sm font-bold tracking-[0.25em] uppercase select-none"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
            >
              STREAMSELF PRÉPARE VOTRE FILM...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {buffering && !initialLoading && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {!playing && !buffering && <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-24 h-24 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
            <Play className="w-11 h-11 text-white fill-white ml-1.5" />
          </div>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-between pointer-events-none">

            {/* Top bar — Logo + title + episodes button (NO back button) */}
            <div className="pointer-events-auto px-6 pt-5 pb-16 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center gap-4">
              <h1 className="text-white font-semibold text-base truncate drop-shadow-lg flex-1">{title}</h1>

              {/* Episodes button */}
              {type === 'series' && seriesDbId && (
                <button onClick={() => setShowEpisodes(true)}
                  className="flex items-center gap-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl transition-all border border-white/10 shrink-0">
                  <List className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Épisodes</span>
                </button>
              )}

              {/* Logo top right — pas de lien */}
              <div className="shrink-0">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT_Image_27_avr._2026_a%CC%80_00_48_07-removebg-preview-q9gJZZAURjXxiGLwtVf8BsKdJaOxq9.png"
                  alt="StreamSelf"
                  width={100}
                  height={30}
                  className="h-7 w-auto opacity-70"
                />
              </div>
            </div>

            {/* Bottom controls — identical to NativePlayer */}
            <div className="pointer-events-auto px-6 pb-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              <p className="text-white/50 text-xs font-medium mb-2 truncate">{title}</p>
              <div ref={progressRef} className="relative w-full cursor-pointer group/bar mb-4" style={{ height: '4px' }} onClick={seek}
                onMouseMove={onProgressHover} onMouseLeave={() => setHoverTime(null)}
                onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.height = '6px' }}
                onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.height = '4px' }}>
                <div className="absolute inset-0 bg-white/20 rounded-full" />
                <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${buffered}%` }} />
                <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 scale-0 group-hover/bar:scale-100 transition-all" />
                </div>
                {hoverTime !== null && (
                  <div className="absolute -top-8 bg-black/80 text-white text-xs px-2 py-1 rounded-lg pointer-events-none -translate-x-1/2 whitespace-nowrap" style={{ left: hoverX }}>{fmt(hoverTime)}</div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => skip(-10)} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all"><SkipBack className="w-5 h-5" /></button>
                <button onClick={togglePlay} className="text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                  {playing ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-0.5" />}
                </button>
                <button onClick={() => skip(10)} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all"><SkipForward className="w-5 h-5" /></button>
                <div className="flex items-center gap-1 ml-1" onMouseEnter={() => setShowVol(true)} onMouseLeave={() => setShowVol(false)}>
                  <button onClick={toggleMute} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                    {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <AnimatePresence>
                    {showVol && <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 80, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden">
                      <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={e => changeVolume(+e.target.value)} className="w-20 accent-primary cursor-pointer" />
                    </motion.div>}
                  </AnimatePresence>
                </div>
                <span className="text-white/50 text-sm font-mono ml-2 tabular-nums">{fmt(currentTime)} / {fmt(duration)}</span>
                <div className="flex-1" />
                <button onClick={toggleFs} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                  {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEpisodes && seriesDbId && tmdbId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black z-40" onClick={() => setShowEpisodes(false)} />
            <EpisodesPanel
              seriesDbId={seriesDbId} tmdbId={tmdbId}
              currentSeason={currentSeason} currentEpisode={currentEpisode}
              onClose={() => setShowEpisodes(false)}
              onSelectEpisode={handleSelectEpisode}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
