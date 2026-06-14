'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, SkipBack, SkipForward, Cast,
  Film, Loader2, List, X, ChevronDown, ChevronUp, Settings,
  ChevronLeft, ChevronRight, Download
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
  seriesName?: string | null
  downloadUrl?: string | null
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
              className="mt-2 bg-zinc-900 rounded-2xl border border-white/10 overflow-y-auto overscroll-contain" style={{ maxHeight: '40vh', WebkitOverflowScrolling: 'touch' }}>
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
  seriesName = null,
  downloadUrl = null,
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
  const [currentDownloadUrl, setCurrentDownloadUrl] = useState<string | null>(downloadUrl)
  const [isDownloading, setIsDownloading] = useState(false)

  const getDisplayTitle = (season: number, episode: number) =>
    type === 'series' && seriesName
      ? `${seriesName} - S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
      : title

  const [displayTitle, setDisplayTitle] = useState(() =>
    type === 'series' && seriesName
      ? `${seriesName} - S${String(initialSeason).padStart(2, '0')}E${String(initialEpisode).padStart(2, '0')}`
      : initialTitle
  )
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
  const [showError, setShowError] = useState(false)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showVol, setShowVol] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'audio' | 'subtitles'>('audio')
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [subtitle, setSubtitle] = useState<'off' | 'fr' | 'en'>('off')

  // Refs pour capturer les valeurs dynamiques sans recréer le timer
  const tmdbIdRef = useRef(tmdbId)
  const typeRef = useRef(type)
  const titleRef = useRef(title)
  const currentSeasonRef = useRef(currentSeason)
  const currentEpisodeRef = useRef(currentEpisode)

  useEffect(() => { tmdbIdRef.current = tmdbId }, [tmdbId])
  useEffect(() => { typeRef.current = type }, [type])
  useEffect(() => { titleRef.current = title }, [title])
  useEffect(() => { currentSeasonRef.current = currentSeason }, [currentSeason])
  useEffect(() => { currentEpisodeRef.current = currentEpisode }, [currentEpisode])

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
    v.addEventListener('canplay', () => {
      setBuffering(false)
      setInitialLoading(false)
      setShowError(false)
      sessionStorage.removeItem('player_reload_count')
      if (errorTimer.current) clearTimeout(errorTimer.current)
    })
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

  const autoReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 5s auto-reload up to 3 times if video hasn't started
  useEffect(() => {
    if (!initialLoading) {
      if (autoReloadTimer.current) clearTimeout(autoReloadTimer.current)
      return
    }
    const reloadCount = parseInt(sessionStorage.getItem('player_reload_count') || '0')
    if (reloadCount >= 3) return
    autoReloadTimer.current = setTimeout(() => {
      if (initialLoading) {
        sessionStorage.setItem('player_reload_count', String(reloadCount + 1))
        window.location.reload()
      }
    }, 5000)
    return () => { if (autoReloadTimer.current) clearTimeout(autoReloadTimer.current) }
  }, [initialLoading])

  // 30s error timeout — dépend UNIQUEMENT de initialLoading
  // Les valeurs dynamiques (title, season, episode...) passent par des refs
  useEffect(() => {
    if (!initialLoading) return
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(async () => {
      setShowError(true)
      try {
        const res = await fetch('/api/player-errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdb_id: tmdbIdRef.current ?? null,
            content_type: typeRef.current,
            title: titleRef.current ?? '',
            season: typeRef.current === 'series' ? (currentSeasonRef.current ?? null) : null,
            episode: typeRef.current === 'series' ? (currentEpisodeRef.current ?? null) : null,
          }),
        })
        if (!res.ok) console.error('[PlayerError] API error', res.status, await res.text())
        else console.log('[PlayerError] signalé avec succès')
      } catch (e) { console.error('[PlayerError] fetch failed', e) }
    }, 30000)
    return () => { if (errorTimer.current) clearTimeout(errorTimer.current) }
  }, [initialLoading]) // ← SEULEMENT initialLoading

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

  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([])

  useEffect(() => {
    if (type !== 'series' || !seriesDbId) return
    fetch(`/api/auth/admin/episodes?seriesId=${seriesDbId}`)
      .then(r => r.json())
      .then((data: Episode[]) => setAllEpisodes(data || []))
      .catch(() => {})
  }, [seriesDbId, type])

  const sortedEpisodes = [...allEpisodes].sort((a, b) =>
    a.season_number !== b.season_number ? a.season_number - b.season_number : a.episode_number - b.episode_number
  )
  const currentIdx = sortedEpisodes.findIndex(e => e.season_number === currentSeason && e.episode_number === currentEpisode)
  const prevEp = currentIdx > 0 ? sortedEpisodes[currentIdx - 1] : null
  const nextEp = currentIdx < sortedEpisodes.length - 1 ? sortedEpisodes[currentIdx + 1] : null

  const goToEpisode = (ep: Episode) => {
    if (!ep.video_url) return
    handleSelectEpisode(ep.season_number, ep.episode_number, ep.video_url, ep.title || `Épisode ${ep.episode_number}`)
  }

  const handleSelectEpisode = (season: number, episode: number, url: string, epTitle: string) => {
    setCurrentSeason(season); setCurrentEpisode(episode); setVideoUrl(url); setTitle(epTitle)
    setDisplayTitle(
      type === 'series' && seriesName
        ? `${seriesName} - S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
        : epTitle
    )
    setShowEpisodes(false); setBuffering(true); setInitialLoading(true); setShowError(false)
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
              Ce contenu n'est pas encore disponible sur nos sources. Revenez plus tard.
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
              {/* Cercle de fond */}
              <div className="absolute w-16 h-16 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.06)' }} />
              {/* Arc tournant principal */}
              <motion.div
                className="absolute w-16 h-16 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, #e50914 0%, rgba(229,9,20,0.15) 35%, transparent 60%)',
                  borderRadius: '50%',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              />
              {/* Masque central */}
              <div className="absolute w-[52px] h-[52px] rounded-full" style={{ background: 'rgba(6,1,1,0.95)' }} />
              {/* Logo au centre */}
              <div className="relative w-6 h-6 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-red-600" style={{ boxShadow: '0 0 8px 2px rgba(229,9,20,0.6)' }} />
              </div>
            </div>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-white/50 text-xs font-medium tracking-[0.3em] uppercase select-none"
            >
              STREAMSELF PRÉPARE VOTRE {type === 'series' ? 'SÉRIE' : 'FILM'}...
            </motion.p>


          </motion.div>
        )}
      </AnimatePresence>

      {/* 30s error popup */}
      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="mx-4 rounded-2xl p-8 flex flex-col items-center text-center max-w-sm w-full"
              style={{ background: 'rgba(18,8,8,0.95)', border: '1px solid rgba(229,9,20,0.3)' }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Problème de lecture</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Le contenu met trop de temps à se lancer.<br/>Réessayez ou revenez plus tard.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => router.back()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Retour
                </button>
                <button
                  onClick={() => { setShowError(false); setInitialLoading(true); const v = videoRef.current; if (v) { v.load(); v.play() } }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: 'rgba(229,9,20,0.85)', border: '1px solid rgba(229,9,20,0.5)' }}
                >
                  Réessayer
                </button>
              </div>
            </motion.div>
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

      {/* Prev / Play / Next episode buttons — series only */}
      {type === 'series' && (
        <AnimatePresence>
          {showControls && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none">
              {/* Prev episode */}
              <button
                onClick={() => prevEp && goToEpisode(prevEp)}
                disabled={!prevEp}
                className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center border transition-all backdrop-blur-sm ${prevEp ? 'bg-black/50 border-white/20 text-white hover:bg-white/20' : 'bg-black/20 border-white/10 text-white/20 cursor-not-allowed'}`}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
              </button>

              {/* Center play — invisible spacer to keep layout balanced */}
              <div className="w-24 h-24" />

              {/* Next episode */}
              <button
                onClick={() => nextEp && goToEpisode(nextEp)}
                disabled={!nextEp}
                className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center border transition-all backdrop-blur-sm ${nextEp ? 'bg-black/50 border-white/20 text-white hover:bg-white/20' : 'bg-black/20 border-white/10 text-white/20 cursor-not-allowed'}`}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z"/></svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showControls && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-between pointer-events-none">

            {/* Top bar — Logo + title + episodes button (NO back button) */}
            <div className="pointer-events-auto px-6 pt-5 pb-16 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center gap-4">
              <h1 className="text-white font-semibold text-base truncate drop-shadow-lg flex-1">{displayTitle}</h1>

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
              <p className="text-white/50 text-xs font-medium mb-2 truncate">{displayTitle}</p>
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
                {currentDownloadUrl && (
                  <button
                    disabled={isDownloading}
                    onClick={async e => {
                      e.stopPropagation()
                      if (isDownloading) return
                      setIsDownloading(true)
                      try {
                        const r = await fetch('/api/admin/resolve-download', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ url: currentDownloadUrl }),
                        })
                        if (!r.ok) throw new Error('resolve failed')
                        const d = await r.json()
                        if (!d.url || d.error) throw new Error(d.error || 'no url')
                        window.open(d.url, '_blank')
                      } catch {
                        window.open(currentDownloadUrl, '_blank')
                      } finally {
                        setIsDownloading(false)
                      }
                    }}
                    className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
                    title="Télécharger"
                  >
                    {isDownloading
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <Download className="w-5 h-5" />
                    }
                  </button>
                )}
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
