'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, SkipBack, SkipForward, Cast,
  Film, Loader2, List, X, ChevronDown, ChevronUp, Settings
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Hls from 'hls.js'

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

interface NativePlayerProps {
  videoUrl: string | null
  title: string
  backUrl: string
  type?: 'movie' | 'series'
  tmdbId?: number
  seriesDbId?: number
  currentSeason?: number
  currentEpisode?: number
  userId?: string | null
  poster?: string | null
}

// ─── Episodes Panel ────────────────────────────────────────────────────────────

function EpisodesPanel({
  seriesDbId,
  tmdbId,
  currentSeason,
  currentEpisode,
  onClose,
  onSelectEpisode,
}: {
  seriesDbId: number
  tmdbId: number
  currentSeason: number
  currentEpisode: number
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
      .then((data: Episode[]) => {
        setEpisodes(data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [seriesDbId])

  const seasons = [...new Set(episodes.map(e => e.season_number))].sort((a, b) => a - b)
  const filteredEps = episodes.filter(e => e.season_number === selectedSeason)
  const watchedCount = episodes.filter(e => e.video_url).length

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute inset-y-0 right-0 w-full sm:w-96 bg-zinc-950/95 backdrop-blur-xl flex flex-col z-50 border-l border-white/5"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <List className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Épisodes</h2>
              <p className="text-white/40 text-xs">{watchedCount}/{episodes.length} vus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Season selector */}
      <div className="px-4 py-3 border-b border-white/5">
        <button
          onClick={() => setShowSeasonPicker(!showSeasonPicker)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/10"
        >
          <span className="text-white/60 text-sm">Saison</span>
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-lg">{selectedSeason}</span>
            {showSeasonPicker
              ? <ChevronUp className="w-4 h-4 text-white/40" />
              : <ChevronDown className="w-4 h-4 text-white/40" />}
          </div>
        </button>

        <AnimatePresence>
          {showSeasonPicker && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="overflow-hidden mt-2 bg-zinc-900 rounded-2xl border border-white/10"
            >
              {seasons.map(s => {
                const sEps = episodes.filter(e => e.season_number === s)
                const isSelected = s === selectedSeason
                return (
                  <button
                    key={s}
                    onClick={() => { setSelectedSeason(s); setShowSeasonPicker(false) }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors ${isSelected ? 'text-primary' : 'text-white'}`}
                  >
                    <span className="font-semibold">Saison {s}</span>
                    <span className={`text-sm ${isSelected ? 'text-primary font-bold' : 'text-white/40'}`}>{sEps.length} ép.</span>
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Episodes list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredEps.length === 0 ? (
          <p className="text-white/40 text-center py-12 text-sm">Aucun épisode</p>
        ) : (
          <div className="py-2">
            {filteredEps.map(ep => {
              const isCurrent = ep.season_number === currentSeason && ep.episode_number === currentEpisode
              const hasVideo = !!ep.video_url
              return (
                <button
                  key={ep.id}
                  onClick={() => {
                    if (hasVideo) {
                      onSelectEpisode(ep.season_number, ep.episode_number, ep.video_url!, ep.title || `Épisode ${ep.episode_number}`)
                    }
                  }}
                  disabled={!hasVideo}
                  className={`w-full flex gap-3 px-4 py-3 text-left transition-all ${
                    isCurrent ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-white/5 border-l-2 border-transparent'
                  } ${!hasVideo ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                    {ep.still_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${ep.still_path}`}
                        alt={ep.title || ''}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-5 h-5 text-white/20" />
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                      E{ep.episode_number}
                    </div>
                    {isCurrent && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate mb-0.5 ${isCurrent ? 'text-primary' : 'text-white'}`}>
                      {ep.title || `Épisode ${ep.episode_number}`}
                    </p>
                    {ep.runtime && (
                      <p className="text-white/40 text-xs mb-1">{ep.runtime} min</p>
                    )}
                    {ep.overview && (
                      <p className="text-white/40 text-xs line-clamp-2">{ep.overview}</p>
                    )}
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-primary text-xs font-medium mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        EN COURS
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Player ───────────────────────────────────────────────────────────────

export function NativePlayer({
  videoUrl: initialVideoUrl,
  title: initialTitle,
  backUrl,
  type = 'movie',
  tmdbId,
  seriesDbId,
  currentSeason: initialSeason = 1,
  currentEpisode: initialEpisode = 1,
  userId = null,
  poster = null,
}: NativePlayerProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
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
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'audio' | 'subtitles'>('audio')
  const [subtitle, setSubtitle] = useState<'off' | 'fr' | 'en'>('off')
  const [hlsAudioTracks, setHlsAudioTracks] = useState<{ id: number; name: string; lang: string }[]>([])

  // ─── Save watch progress ─────────────────────────────────────────────────────
  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const currentSeasonRef = useRef(initialSeason)
  const currentEpisodeRef = useRef(initialEpisode)
  const titleRef = useRef(initialTitle)

  // Keep refs in sync so the save function always has latest values
  useEffect(() => { currentSeasonRef.current = currentSeason }, [currentSeason])
  useEffect(() => { currentEpisodeRef.current = currentEpisode }, [currentEpisode])
  useEffect(() => { titleRef.current = title }, [title])

  const saveProgress = useCallback(async () => {
    if (!userId || !tmdbId) return
    const ct = currentTimeRef.current
    const dur = durationRef.current
    if (dur < 10) return // Don't save if barely started
    const progress = Math.round((ct / dur) * 100)
    try {
      await fetch('/api/watch-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          tmdb_id: tmdbId,
          content_type: type,
          title: titleRef.current,
          poster: poster,
          season: type === 'series' ? currentSeasonRef.current : null,
          episode: type === 'series' ? currentEpisodeRef.current : null,
          progress,
        }),
      })
    } catch {}
  }, [userId, tmdbId, type, poster])

  // Save every 30s
  useEffect(() => {
    if (!userId) return
    const interval = setInterval(saveProgress, 30000)
    return () => clearInterval(interval)
  }, [saveProgress, userId])

  // Save on unmount
  useEffect(() => {
    return () => { saveProgress() }
  }, [saveProgress])

  const fmt = (s: number) => {
    if (isNaN(s)) return '0:00'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`
  }

  const resetTimer = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3500)
  }, [])

  // ─── HLS loader ─────────────────────────────────────────────────────────────
  const loadVideo = useCallback((url: string) => {
    const v = videoRef.current
    if (!v) return

    // Destroy previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    setHlsAudioTracks([])

    const isHls = url.includes('.m3u8')

    if (isHls && Hls.isSupported()) {
      // Chrome + Firefox : HLS.js
      const hls = new Hls({ enableWorker: true })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(v)

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        // Expose audio tracks to state for UI
        const tracks = hls.audioTracks.map(t => ({
          id: t.id,
          name: t.name ?? t.lang ?? `Track ${t.id}`,
          lang: t.lang ?? '',
        }))
        setHlsAudioTracks(tracks)

        // Auto-select French track if available
        const frIdx = hls.audioTracks.findIndex(t =>
          t.lang === 'fr' ||
          t.name?.toLowerCase().includes('fran') ||
          t.name?.toLowerCase().includes('french')
        )
        if (frIdx !== -1) hls.audioTrack = frIdx

        v.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              hls.destroy()
          }
        }
      })
    } else if (isHls && v.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari : HLS natif
      v.src = url
      v.play().catch(() => {})
    } else {
      // MP4 natif
      v.src = url
      v.play().catch(() => {})
    }
  }, [])

  // ─── Mount & video events ───────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onTimeUpdate = () => {
        setCurrentTime(v.currentTime)
        currentTimeRef.current = v.currentTime
      }
    const onMeta = () => {
      setDuration(v.duration)
      durationRef.current = v.duration
      // Disable all text tracks by default
      for (let i = 0; i < v.textTracks.length; i++) {
        v.textTracks[i].mode = 'disabled'
      }
    }
    const onPlay = () => { setPlaying(true); resetTimer() }
    const onPause = () => { setPlaying(false); setShowControls(true) }
    const onWaiting = () => setBuffering(true)
    const onCanPlay = () => { setBuffering(false); setInitialLoading(false) }
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)
      }
    }

    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('canplay', onCanPlay)
    v.addEventListener('progress', onProgress)

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('canplay', onCanPlay)
      v.removeEventListener('progress', onProgress)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [resetTimer])

  // Load video on mount / url change
  useEffect(() => {
    if (videoUrl) {
      setBuffering(true)
      loadVideo(videoUrl)
    }
    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [videoUrl, loadVideo])

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Close settings on outside click
  useEffect(() => {
    if (!showSettings) return
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSettings])

  // Keyboard shortcuts
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

  // ─── Controls ───────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current
    if (v) v.paused ? v.play() : v.pause()
  }

  const skip = (s: number) => {
    const v = videoRef.current
    if (v) { v.currentTime = Math.max(0, Math.min(duration, v.currentTime + s)); resetTimer() }
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (v) { v.muted = !v.muted; setMuted(v.muted) }
  }

  const changeVolume = (val: number) => {
    const v = videoRef.current
    if (!v) return
    v.volume = val
    setVolume(val)
    setMuted(val === 0)
  }

  // ─── Language switching (Chrome via HLS.js, Safari via audioTracks natif) ──
  const changeLanguage = (lang: 'fr' | 'en') => {
    setLanguage(lang)
    setShowSettings(false)

    const hls = hlsRef.current

    if (hls) {
      // ✅ HLS.js (Chrome, Firefox)
      const tracks = hls.audioTracks
      const idx = tracks.findIndex(t => {
        const l = (t.lang ?? '').toLowerCase()
        const n = (t.name ?? '').toLowerCase()
        return lang === 'fr'
          ? l === 'fr' || n.includes('fran') || n.includes('french') || n.includes('vf')
          : l === 'en' || n.includes('angl') || n.includes('english') || n.includes('vo')
      })
      if (idx !== -1) hls.audioTrack = idx
    } else {
      // ✅ Safari / natif — audioTracks API
      const v = videoRef.current
      const nativeTracks = (v as any)?.audioTracks
      if (nativeTracks) {
        for (let i = 0; i < nativeTracks.length; i++) {
          const t = nativeTracks[i]
          const l = (t.language ?? '').toLowerCase()
          const n = (t.label ?? '').toLowerCase()
          t.enabled = lang === 'fr'
            ? l === 'fr' || n.includes('fran') || n.includes('french')
            : l === 'en' || n.includes('angl') || n.includes('english')
        }
      }
    }
  }

  // ─── Subtitles ──────────────────────────────────────────────────────────────
  const changeSubtitle = useCallback((sub: 'off' | 'fr' | 'en') => {
    setSubtitle(sub)
    const v = videoRef.current
    if (!v) return
    const tracks = v.textTracks
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i]
      if (sub === 'off') {
        t.mode = 'disabled'
      } else {
        const match = sub === 'fr'
          ? (t.language === 'fr' || t.label?.toLowerCase().includes('fr') || t.label?.toLowerCase().includes('français'))
          : (t.language === 'en' || t.label?.toLowerCase().includes('en') || t.label?.toLowerCase().includes('eng'))
        t.mode = match ? 'showing' : 'disabled'
      }
    }
  }, [])

  // ─── Fullscreen ─────────────────────────────────────────────────────────────
  const toggleFs = () => {
    const el = containerRef.current
    const v = videoRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen()
    } else if (v && (v as any).webkitEnterFullscreen) {
      ;(v as any).webkitEnterFullscreen()
    } else {
      el.requestFullscreen()
    }
  }

  // ─── Progress bar ────────────────────────────────────────────────────────────
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    const bar = progressRef.current
    if (!v || !bar) return
    const pct = Math.max(0, Math.min(1, (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth))
    v.currentTime = pct * duration
    resetTimer()
  }

  const onProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    if (!bar) return
    const pct = Math.max(0, Math.min(1, (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth))
    setHoverTime(pct * duration)
    setHoverX(e.clientX - bar.getBoundingClientRect().left)
  }

  // ─── Episode selection ───────────────────────────────────────────────────────
  const handleSelectEpisode = (season: number, episode: number, url: string, episodeTitle: string) => {
    setCurrentSeason(season)
    setCurrentEpisode(episode)
    setVideoUrl(url)
    setTitle(episodeTitle)
    setShowEpisodes(false)
    setBuffering(true)
    setInitialLoading(true)
    loadVideo(url)
    router.replace(`/watch/series/${tmdbId}?play=1&season=${season}&episode=${episode}`, { scroll: false })
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  // ─── No video ────────────────────────────────────────────────────────────────
  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(180,20,20,0.12) 0%, transparent 70%)' }} />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          {/* Icon with rings */}
          <div className="relative flex items-center justify-center mb-2">
            <div className="absolute w-32 h-32 rounded-full border border-red-500/10 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute w-24 h-24 rounded-full border border-red-500/15" />
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
              <Film className="w-9 h-9 text-zinc-500" />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h2 className="text-white font-bold text-2xl tracking-tight">Contenu non disponible</h2>
            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
              Ce contenu n'a pas encore été ajouté par l'administrateur. Revenez plus tard.
            </p>
          </div>

          {/* Back button */}
          <Link href={backUrl}>
            <button className="mt-2 group flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-semibold text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}>
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Retour
            </button>
          </Link>
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="w-screen bg-black relative overflow-hidden"
      style={{ height: '100dvh' }}
      onMouseMove={resetTimer}
      onMouseLeave={() => playing && !showEpisodes && setShowControls(false)}
    >
      {/* Video — no src attr, managed by loadVideo() */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onClick={togglePlay}
      />

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

      {/* Buffering spinner (mid-play only) */}
      <AnimatePresence>
        {buffering && !initialLoading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big play icon */}
      <AnimatePresence>
        {!playing && !buffering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-24 h-24 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
              <Play className="w-11 h-11 text-white fill-white ml-1.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-between pointer-events-none"
          >
            {/* Top bar */}
            <div className="pointer-events-auto px-6 pt-5 pb-16 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center gap-4">
              <Link href={backUrl} className="shrink-0">
                <button className="flex items-center gap-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl transition-all border border-white/10">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Retour</span>
                </button>
              </Link>
              <h1 className="text-white font-semibold text-base truncate drop-shadow-lg flex-1">{title}</h1>

              {type === 'series' && seriesDbId && (
                <button
                  onClick={() => setShowEpisodes(true)}
                  className="flex items-center gap-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl transition-all border border-white/10 shrink-0"
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Épisodes</span>
                </button>
              )}
            </div>

            {/* Bottom controls */}
            <div className="pointer-events-auto px-6 pb-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              <p className="text-white/50 text-xs font-medium mb-2 truncate">{title}</p>

              {/* Progress bar */}
              <div
                ref={progressRef}
                className="relative w-full cursor-pointer group/bar mb-4"
                style={{ height: '4px' }}
                onClick={seek}
                onMouseMove={onProgressHover}
                onMouseLeave={() => setHoverTime(null)}
                onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.height = '6px' }}
                onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.height = '4px' }}
              >
                <div className="absolute inset-0 bg-white/20 rounded-full" />
                <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${buffered}%` }} />
                <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 scale-0 group-hover/bar:scale-100 transition-all" />
                </div>
                {hoverTime !== null && (
                  <div
                    className="absolute -top-8 bg-black/80 text-white text-xs px-2 py-1 rounded-lg pointer-events-none -translate-x-1/2 whitespace-nowrap"
                    style={{ left: hoverX }}
                  >
                    {fmt(hoverTime)}
                  </div>
                )}
              </div>

              {/* Buttons row */}
              <div className="flex items-center gap-1">
                <button onClick={() => skip(-10)} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button onClick={togglePlay} className="text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                  {playing
                    ? <Pause className="w-7 h-7 fill-white" />
                    : <Play className="w-7 h-7 fill-white ml-0.5" />}
                </button>
                <button onClick={() => skip(10)} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                  <SkipForward className="w-5 h-5" />
                </button>

                {/* Volume */}
                <div
                  className="flex items-center gap-1 ml-1"
                  onMouseEnter={() => setShowVol(true)}
                  onMouseLeave={() => setShowVol(false)}
                >
                  <button onClick={toggleMute} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                    {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <AnimatePresence>
                    {showVol && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }} animate={{ width: 80, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          type="range" min="0" max="1" step="0.05"
                          value={muted ? 0 : volume}
                          onChange={e => changeVolume(+e.target.value)}
                          className="w-20 accent-primary cursor-pointer"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <span className="text-white/50 text-sm font-mono ml-2 tabular-nums">
                  {fmt(currentTime)} / {fmt(duration)}
                </span>

                <div className="flex-1" />

                {/* Cast */}
                <button
                  onClick={() => {
                    // @ts-ignore
                    if (videoRef.current?.webkitShowPlaybackTargetPicker) videoRef.current.webkitShowPlaybackTargetPicker()
                    else alert('Casting : utilisez Chrome ou Safari')
                  }}
                  className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all"
                >
                  <Cast className="w-5 h-5" />
                </button>

                {/* Settings */}
                <div ref={settingsRef} className="relative">
                  <button
                    onClick={() => setShowSettings(s => !s)}
                    className={`p-2.5 rounded-xl hover:bg-white/10 transition-all ${showSettings ? 'text-white bg-white/10' : 'text-white/70 hover:text-white'}`}
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full right-0 mb-2 shadow-2xl"
                        style={{
                          background: 'rgba(22,22,22,0.96)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          minWidth: '260px',
                          backdropFilter: 'blur(12px)',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Settings header */}
                        <div className="flex items-center justify-between" style={{ padding: '14px 18px 10px' }}>
                          <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em' }}>RÉGLAGES</span>
                          <button onClick={() => setShowSettings(false)} style={{ color: 'rgba(255,255,255,0.45)' }} className="hover:text-white transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          {(['audio', 'subtitles'] as const).map(tab => (
                            <button
                              key={tab}
                              onClick={() => setSettingsTab(tab)}
                              className="relative transition-colors"
                              style={{
                                flex: 1,
                                padding: '9px 0 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: settingsTab === tab ? '#fff' : 'rgba(255,255,255,0.32)',
                              }}
                            >
                              {tab === 'audio' ? 'SOURCE · AUDIO' : 'SOUS-TITRES'}
                              {settingsTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0" style={{ height: '2px', background: '#e53935' }} />
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Audio tab */}
                        {settingsTab === 'audio' ? (
                          <div style={{ padding: '4px 0' }}>
                            {(['fr', 'en'] as const).map(lang => {
                              const active = language === lang
                              return (
                                <button
                                  key={lang}
                                  onClick={() => changeLanguage(lang)}
                                  className="w-full flex items-center gap-3 transition-colors"
                                  style={{
                                    padding: '10px 18px',
                                    background: active ? 'rgba(180,20,20,0.25)' : 'transparent',
                                  }}
                                >
                                  <span style={{
                                    width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                                    background: active ? '#e53935' : 'rgba(255,255,255,0.28)',
                                  }} />
                                  <span style={{
                                    fontSize: '13px',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? '#e53935' : 'rgba(255,255,255,0.82)',
                                  }}>
                                    {lang === 'fr' ? 'Français' : 'Anglais'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          /* Subtitles tab */
                          <div style={{ padding: '4px 0' }}>
                            {(['off', 'fr', 'en'] as const).map(sub => {
                              const active = subtitle === sub
                              return (
                                <button
                                  key={sub}
                                  onClick={() => changeSubtitle(sub)}
                                  className="w-full flex items-center gap-3 transition-colors"
                                  style={{
                                    padding: '10px 18px',
                                    background: active ? 'rgba(180,20,20,0.25)' : 'transparent',
                                  }}
                                >
                                  <span style={{
                                    width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                                    background: active ? '#e53935' : 'rgba(255,255,255,0.28)',
                                  }} />
                                  <span style={{
                                    fontSize: '13px',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? '#e53935' : 'rgba(255,255,255,0.82)',
                                  }}>
                                    {sub === 'off' ? 'Désactivés' : sub === 'fr' ? 'FR Full · SRT' : 'ENG Full · SRT'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Fullscreen */}
                <button onClick={toggleFs} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                  {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Episodes panel */}
      <AnimatePresence>
        {showEpisodes && seriesDbId && tmdbId && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black z-40"
              onClick={() => setShowEpisodes(false)}
            />
            <EpisodesPanel
              seriesDbId={seriesDbId}
              tmdbId={tmdbId}
              currentSeason={currentSeason}
              currentEpisode={currentEpisode}
              onClose={() => setShowEpisodes(false)}
              onSelectEpisode={handleSelectEpisode}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
