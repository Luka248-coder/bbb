'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, SkipBack, SkipForward, Cast,
  Film, Loader2, List, X, ChevronDown, ChevronUp, Settings, Download,
  Lock, LogIn
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
  profileId?: string | null
  poster?: string | null
  seriesName?: string | null
  downloadUrl?: string | null
}

// ─── Episodes Panel ────────────────────────────────────────────────────────────

function EpisodesPanel({
  seriesDbId,
  tmdbId,
  currentSeason,
  currentEpisode,
  onClose,
  onSelectEpisode,
  onSelectEpisodeApi,
}: {
  seriesDbId?: number
  tmdbId: number
  currentSeason: number
  currentEpisode: number
  onClose: () => void
  onSelectEpisode: (season: number, episode: number, url: string, title: string) => void
  onSelectEpisodeApi: (season: number, episode: number, title: string) => void
}) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(currentSeason)
  const [showSeasonPicker, setShowSeasonPicker] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (seriesDbId) {
        try {
          const r = await fetch(`/api/auth/admin/episodes?seriesId=${seriesDbId}`)
          const data: Episode[] = await r.json()
          if (data && data.length > 0) {
            setEpisodes(data)
            setLoading(false)
            return
          }
        } catch {}
      }
      try {
        const r = await fetch(`/api/content/series/${tmdbId}`)
        const d = await r.json()
        const totalSeasons: number = d?.details?.number_of_seasons || 1
        const all: Episode[] = []
        for (let s = 1; s <= totalSeasons; s++) {
          const sr = await fetch(`/api/content/series/${tmdbId}?season=${s}`)
          if (!sr.ok) continue
          const sd = await sr.json()
          for (const ep of (sd.seasonData?.episodes || [])) {
            all.push({
              id: ep.id,
              series_id: 0,
              season_number: ep.season_number,
              episode_number: ep.episode_number,
              title: ep.name || `Épisode ${ep.episode_number}`,
              overview: ep.overview,
              still_path: ep.still_path,
              runtime: ep.runtime,
              video_url: null,
            } as any)
          }
        }
        setEpisodes(all)
      } catch {}
      setLoading(false)
    }
    load()
  }, [seriesDbId, tmdbId])

  const seasons = [...new Set(episodes.map(e => e.season_number))].sort((a, b) => a - b)
  const filteredEps = episodes.filter(e => e.season_number === selectedSeason)

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute inset-y-0 right-0 w-full sm:w-96 bg-zinc-950/95 backdrop-blur-xl flex flex-col z-50 border-l border-white/5"
      onClick={e => e.stopPropagation()}
    >
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <List className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Épisodes</h2>
              <p className="text-white/40 text-xs">{episodes.length} épisodes</p>
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
              className="mt-2 bg-zinc-900 rounded-2xl border border-white/10 overflow-y-auto overscroll-contain" style={{ maxHeight: '40vh', WebkitOverflowScrolling: 'touch' }}
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
              const epTitle = ep.title || `Épisode ${ep.episode_number}`
              return (
                <button
                  key={ep.id}
                  onClick={() => {
                    if (ep.video_url) {
                      onSelectEpisode(ep.season_number, ep.episode_number, ep.video_url, epTitle)
                    } else {
                      onSelectEpisodeApi(ep.season_number, ep.episode_number, epTitle)
                    }
                  }}
                  className={`w-full flex gap-3 px-4 py-3 text-left transition-all ${
                    isCurrent ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                    {ep.still_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${ep.still_path}`}
                        alt={epTitle}
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
                      {epTitle}
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
  profileId = null,
  poster = null,
  seriesName = null,
  downloadUrl = null,
}: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const resetTimerRef = useRef<(() => void) | null>(null)

  const [videoUrl, setVideoUrl] = useState(initialVideoUrl)
  const [title, setTitle] = useState(initialTitle)
  const [currentSeason, setCurrentSeason] = useState(initialSeason)
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showUnavailable, setShowUnavailable] = useState(false)
  const [unavailablePoster, setUnavailablePoster] = useState<string | null>(null)
  const router = useRouter()
  // Modale "il faut être connecté" affichée quand on clique sur télécharger sans session
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const getDisplayTitle = (season: number, episode: number) =>
    type === 'series' && seriesName
      ? `${seriesName} - S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
      : title

  const [displayTitle, setDisplayTitle] = useState(() => getDisplayTitle(initialSeason, initialEpisode))
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
  const [fetchingEpisode, setFetchingEpisode] = useState(false)
  const [episodeNotFound, setEpisodeNotFound] = useState(false)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showError, setShowError] = useState(false)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoStarted = useRef(false)

  // Données TMDB pour l'écran pause
  const [tmdbDetails, setTmdbDetails] = useState<{ overview: string; vote_average: number; logo_path: string | null; release_date: string; runtime?: number } | null>(null)

  useEffect(() => {
    if (!tmdbId) return
    const TMDB_KEY = '1a6aed55d15f2da7f2f0ff0586c52174'
    const base = type === 'movie' ? 'movie' : 'tv'
    fetch(`https://api.themoviedb.org/3/${base}/${tmdbId}?api_key=${TMDB_KEY}&language=fr-FR&append_to_response=images&include_image_language=fr,null,en`)
      .then(r => r.json())
      .then(d => {
        const logo = d.images?.logos?.find((l: any) => l.iso_639_1 === 'fr') ||
                     d.images?.logos?.find((l: any) => l.iso_639_1 === 'en') ||
                     d.images?.logos?.[0]
        setTmdbDetails({
          overview: d.overview || '',
          vote_average: d.vote_average || 0,
          logo_path: logo?.file_path || null,
          release_date: d.release_date || d.first_air_date || '',
          runtime: d.runtime || (d.episode_run_time?.[0]),
        })
      })
      .catch(() => {})
  }, [tmdbId, type])

  const [showVol, setShowVol] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'audio' | 'subtitles' | 'effects'>('audio')
  const [subtitle, setSubtitle] = useState<'off' | 'fr' | 'en'>('off')
  const [hlsAudioTracks, setHlsAudioTracks] = useState<{ id: number; name: string; lang: string }[]>([])

  // ─── Effets audio/vidéo ──────────────────────────────────────────────────────
  const [audioBoost, setAudioBoost] = useState(100) // 100 = normal, max 300
  const [brightness, setBrightness] = useState(100) // 100 = normal
  const [contrast, setContrast] = useState(100)     // 100 = normal
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  // ─── Save watch progress ─────────────────────────────────────────────────────
  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const currentSeasonRef = useRef(initialSeason)
  const currentEpisodeRef = useRef(initialEpisode)
  const titleRef = useRef(initialTitle)
  const resumeTimeRef = useRef(0)

  const playingRef = useRef(false)
  const syncVideoState = useCallback((video: HTMLVideoElement) => {
    const nextTime = Number.isFinite(video.currentTime) ? video.currentTime : 0
    const nextDuration = Number.isFinite(video.duration) ? video.duration : 0

    setCurrentTime(nextTime)
    currentTimeRef.current = nextTime

    if (nextDuration > 0) {
      setDuration(nextDuration)
      durationRef.current = nextDuration
    }

    // Ne mettre à jour playing que si la valeur change vraiment (évite re-renders inutiles)
    const nextPlaying = !video.paused && !video.ended
    if (nextPlaying !== playingRef.current) {
      playingRef.current = nextPlaying
      setPlaying(nextPlaying)
    }
  }, [])

  useEffect(() => {
    const id = profileId || userId
    if (!id || !tmdbId) return
    const param = profileId ? `profile_id=${profileId}` : `user_id=${userId}`
    fetch(`/api/watch-history?${param}`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return
        const match = data.find(item =>
          item.content_id === tmdbId &&
          item.content_type === type &&
          (type === 'movie' || (item.season === (initialSeason ?? null) && item.episode === (initialEpisode ?? null)))
        )
        if (match && match.progress > 0 && match.progress < 98) {
          resumeTimeRef.current = match.progress
        }
      })
      .catch(() => {})
  }, [userId, profileId, tmdbId, type, initialSeason, initialEpisode])

  useEffect(() => { currentSeasonRef.current = currentSeason }, [currentSeason])
  useEffect(() => { currentEpisodeRef.current = currentEpisode }, [currentEpisode])
  useEffect(() => { titleRef.current = title }, [title])

  const tmdbIdRef = useRef(tmdbId)
  const typeRef = useRef(type)
  useEffect(() => { tmdbIdRef.current = tmdbId }, [tmdbId])
  useEffect(() => { typeRef.current = type }, [type])

  // ─── Start / clear the 30s error timer ──────────────────────────────────────
  const startErrorTimer = useCallback(() => {
    if (errorTimer.current) clearTimeout(errorTimer.current)
    videoStarted.current = false
    errorTimer.current = setTimeout(async () => {
      if (videoStarted.current) return
      setShowError(true)
      try {
        await fetch('/api/player-errors', {
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
      } catch {}
    }, 30000)
  }, [])

  const clearErrorTimer = useCallback(() => {
    if (errorTimer.current) { clearTimeout(errorTimer.current); errorTimer.current = null }
    videoStarted.current = true
  }, [])

  const cancelErrorTimer = useCallback(() => {
    if (errorTimer.current) { clearTimeout(errorTimer.current); errorTimer.current = null }
    videoStarted.current = false
  }, [])

  const saveProgress = useCallback(async () => {
    if (!tmdbId) return
    const id = profileId || userId
    if (!id) return
    const ct = currentTimeRef.current
    const dur = durationRef.current
    if (dur < 10) return
    const progress = Math.round((ct / dur) * 100)
    try {
      await fetch('/api/watch-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profileId ? null : userId,
          profile_id: profileId || null,
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
  }, [userId, profileId, tmdbId, type, poster])

  useEffect(() => {
    if (!userId && !profileId) return
    const interval = setInterval(saveProgress, 30000)
    return () => clearInterval(interval)
  }, [saveProgress, userId, profileId])

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
  resetTimerRef.current = resetTimer

  // ─── HLS loader ─────────────────────────────────────────────────────────────
  const loadVideo = useCallback((url: string) => {
    const v = videoRef.current
    if (!v) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    setHlsAudioTracks([])

    // Reset video element completely
    v.pause()
    v.removeAttribute('src')
    v.load()

    setBuffering(true)
    setPlaying(false)
    setShowError(false)

    const isHls = url.includes('.m3u8')

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(v)

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        const tracks = hls.audioTracks.map(t => ({
          id: t.id,
          name: t.name ?? t.lang ?? `Track ${t.id}`,
          lang: t.lang ?? '',
        }))
        setHlsAudioTracks(tracks)

        const frIdx = hls.audioTracks.findIndex(t =>
          t.lang === 'fr' ||
          t.name?.toLowerCase().includes('fran') ||
          t.name?.toLowerCase().includes('french')
        )
        if (frIdx !== -1) hls.audioTrack = frIdx

        v.muted = true
        startErrorTimer()
        v.play().then(() => {
          v.muted = false
        }).catch(() => {
          cancelErrorTimer()
          setBuffering(false)
          setPlaying(false)
        })
      })

      hls.on(Hls.Events.LEVEL_LOADED, () => {
        if (v.duration && !isNaN(v.duration)) {
          setDuration(v.duration)
          durationRef.current = v.duration
        }
      })
      hls.on(Hls.Events.FRAG_CHANGED, () => {
        setCurrentTime(v.currentTime)
        currentTimeRef.current = v.currentTime
        if (v.duration && !isNaN(v.duration)) {
          setDuration(v.duration)
          durationRef.current = v.duration
        }
        setBuffering(false)
        // Ne PAS appeler resetTimer ici : FRAG_CHANGED fire toutes les ~6-10s
        // ce qui ferait réapparaître les contrôles sans action utilisateur
        clearErrorTimer()
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
      v.src = url
      v.muted = true
      startErrorTimer()
      v.play().then(() => { v.muted = false }).catch(() => {
        cancelErrorTimer()
        setBuffering(false)
        setPlaying(false)
      })
    } else {
      v.src = url
      v.muted = true
      startErrorTimer()
      v.play().then(() => { v.muted = false }).catch(() => {
        cancelErrorTimer()
        setBuffering(false)
        setPlaying(false)
      })
    }
  }, [startErrorTimer, clearErrorTimer, cancelErrorTimer])

  // ─── Mount & video events ───────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    syncVideoState(v)

    const onTimeUpdate = () => {
      syncVideoState(v)
    }
    const onMeta = () => {
      syncVideoState(v)
      if (resumeTimeRef.current > 0 && v.duration > 0) {
        v.currentTime = (resumeTimeRef.current / 100) * v.duration
        resumeTimeRef.current = 0
        syncVideoState(v)
      }
      for (let i = 0; i < v.textTracks.length; i++) {
        v.textTracks[i].mode = 'disabled'
      }
    }
    const onPlay = () => { syncVideoState(v); resetTimer() }
    const onPlaying = () => {
      syncVideoState(v)
      setBuffering(false)
      setShowError(false)
      clearErrorTimer()
      // Ne PAS appeler resetTimer ici : onPlaying fire à chaque segment HLS (~10s)
      // ce qui ferait réapparaître les contrôles en permanence
    }
    const onPause = () => { syncVideoState(v); setBuffering(false); setShowControls(true) }
    const onEnded = () => { syncVideoState(v); setBuffering(false); setShowControls(true) }
    const onWaiting = () => setBuffering(true)
    const onCanPlay = () => {
      syncVideoState(v)
      setBuffering(false)
      setShowError(false)
      clearErrorTimer()
      // Ne pas relancer play() ici : loadVideo() démarre déjà la lecture au
      // chargement. onCanPlay se déclenche aussi après chaque reprise de
      // buffering, donc relancer play() ici coupait/relançait la vidéo et
      // pouvait écraser une pause volontaire de l'utilisateur.
    }
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)
      }
    }
    const syncInterval = window.setInterval(() => syncVideoState(v), 250)

    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('playing', onPlaying)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onEnded)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('canplay', onCanPlay)
    v.addEventListener('durationchange', onMeta)
    v.addEventListener('progress', onProgress)

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('canplay', onCanPlay)
      v.removeEventListener('durationchange', onMeta)
      v.removeEventListener('progress', onProgress)
      window.clearInterval(syncInterval)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [resetTimer, clearErrorTimer, syncVideoState])

  // ─── Si série en DB mais épisode sans URL → overlay immédiat si pas de tmdbId
  useEffect(() => {
    if (type !== 'series' || !seriesDbId || initialVideoUrl || tmdbId) return
    setEpisodeNotFound(true)
  }, [])

  // ─── Purstream : délègue à l'API route + timeout 4s si rien ne joue ─────────
  useEffect(() => {
    if (initialVideoUrl || !tmdbId) return
    const contentTitle = seriesName || initialTitle

    // Lancer le timer 4s dès le départ
    setEpisodeNotFound(false)
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(() => {
      setFetchingEpisode(false)
      setEpisodeNotFound(true)
    }, 4000)

    ;(async () => {
      try {
        const params = new URLSearchParams({
          title: contentTitle,
          type,
          tmdb_id: String(tmdbId),
          ...(type === 'series' && { season: String(initialSeason || 1), episode: String(initialEpisode || 1) }),
        })
        const res = await fetch(`/api/purstream?${params}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.videoUrl) {
          // URL trouvée — annuler le timer et charger
          if (fetchTimeoutRef.current) { clearTimeout(fetchTimeoutRef.current); fetchTimeoutRef.current = null }
          setEpisodeNotFound(false)
          setVideoUrl(data.videoUrl)
        }
      } catch (err) {
        console.error('[Purstream]', err)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId])

  // Load video whenever videoUrl changes
  useEffect(() => {
    if (videoUrl) {
      // URL trouvée — annuler le timer et jouer
      if (fetchTimeoutRef.current) { clearTimeout(fetchTimeoutRef.current); fetchTimeoutRef.current = null }
      setEpisodeNotFound(false)
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

  // ─── Téléchargement ─────────────────────────────────────────────────────────
  const triggerDownload = useCallback(async () => {
    if (!tmdbId || isDownloading) return
    setIsDownloading(true)

    const API_KEY = 'ff_575a3531b4e190e5d8c89543e2a81a948f1b8265d8c1d53edfc631e3f8713d5f'
    const BASE_URL = 'https://fastflux.xyz/api/v1/index.php'
    const TOKEN_SUFFIX = '?ff=1782321640.cxUHiwCk-p2Zd6vzl2OTsS6O'
    const PROXY_BASE = 'https://v0-proxy-ruddy.vercel.app/api/stream?url='

    const buildUrl = (rawUrl: string) => {
      let url = rawUrl
      if (url?.includes('.mp4') && !url.includes('?ff=')) {
        const idx = url.indexOf('.mp4') + 4
        url = url.slice(0, idx) + TOKEN_SUFFIX + (url.slice(idx) ? '&' + url.slice(idx).replace(/^\?/, '') : '')
      }
      return `${PROXY_BASE}${encodeURIComponent(url)}&download=1`
    }

    try {
      let downloadUrl: string | null = null

      if (type === 'movie') {
        // Recherche directe par tmdbId
        const res = await fetch(`${BASE_URL}?route=movies/search&q=${tmdbId}&api_key=${API_KEY}`)
        const data = await res.json()
        const found = (data.data || data.results || []).find((m: any) => String(m.tmdb_id) === String(tmdbId))
        if (found) {
          const rawUrl = found.source?.url || found.url
          if (rawUrl) downloadUrl = buildUrl(rawUrl)
        }

        // Fallback pagination
        if (!downloadUrl) {
          let page = 1
          outer: while (true) {
            const r = await fetch(`${BASE_URL}?route=movies&page=${page}&api_key=${API_KEY}`)
            const d = await r.json()
            const movie = (d.data || []).find((m: any) => String(m.tmdb_id) === String(tmdbId))
            if (movie) { downloadUrl = buildUrl(movie.source?.url || movie.url); break outer }
            if (page >= (d.pagination?.total_pages || 1)) break
            page++
          }
        }
      } else {
        const sNum = String(parseInt(String(currentSeason ?? 1).replace(/\D/g, '') || '1', 10)).padStart(2, '0')
        const eNum = parseInt(String(currentEpisode ?? 1).replace(/\D/g, '') || '1', 10)

        const res = await fetch(`${BASE_URL}?route=series/search&q=${tmdbId}&api_key=${API_KEY}`)
        const data = await res.json()
        const found = (data.data || data.results || []).find((s: any) => String(s.tmdb_id) === String(tmdbId))

        const extractEp = (serie: any) => {
          const ep = (serie.episodes || []).find((ep: any) => {
            // FastFlux format: season="S1", episode_number=1
            const epS = parseInt(String(ep.season || '0').replace(/\D/g, ''), 10)
            const epNum = parseInt(String(ep.episode_number), 10)
            return epS === parseInt(sNum, 10) && epNum === eNum
          })
          return ep ? buildUrl(ep.url) : null
        }

        if (found) {
          downloadUrl = extractEp(found)
        }

        if (!downloadUrl) {
          let page = 1
          outer: while (true) {
            const r = await fetch(`${BASE_URL}?route=series&page=${page}&api_key=${API_KEY}`)
            const d = await r.json()
            const serie = (d.data || []).find((s: any) => String(s.tmdb_id) === String(tmdbId))
            if (serie) { downloadUrl = extractEp(serie); break outer }
            if (page >= (d.pagination?.total_pages || 1)) break
            page++
          }
        }
      }

      if (!downloadUrl) {
        setUnavailablePoster(poster)
        setShowUnavailable(true)
        return
      }

      const a = document.createElement('a')
      a.href = downloadUrl
      a.setAttribute('download', '')
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => document.body.removeChild(a), 1000)

    } catch {
      setUnavailablePoster(poster)
      setShowUnavailable(true)
    } finally {
      setIsDownloading(false)
    }
  }, [tmdbId, type, currentSeason, currentEpisode, poster, isDownloading])

  // Redirige vers /login avec un retour automatique sur cette page (?download=1,
  // utilisé par la page de login pour afficher un message contextuel)
  const goToLoginForDownload = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('download', '1')
    const redirectTarget = `${url.pathname}?${url.searchParams.toString()}`
    router.push(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
  }, [router])

  // ─── Controls ───────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      setShowError(false)
      setBuffering(true)
      startErrorTimer()
      v.play().catch(() => {
        cancelErrorTimer()
        setBuffering(false)
        setPlaying(false)
      })
    } else {
      v.pause()
    }
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

  // ─── Son amplifié (Web Audio API) ───────────────────────────────────────────
  const initAudioBoost = () => {
    if (audioCtxRef.current) return // déjà initialisé
    const video = videoRef.current
    if (!video) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = ctx.createMediaElementSource(video)
      const gain = ctx.createGain()
      gain.gain.value = audioBoost / 100
      source.connect(gain)
      gain.connect(ctx.destination)
      audioCtxRef.current = ctx
      gainNodeRef.current = gain
      audioSourceRef.current = source
    } catch (e) {
      console.warn('Web Audio API non supportée', e)
    }
  }

  const changeAudioBoost = (val: number) => {
    setAudioBoost(val)
    if (!audioCtxRef.current) initAudioBoost()
    if (gainNodeRef.current) gainNodeRef.current.gain.value = val / 100
  }

  // ─── Luminosité / Contraste (CSS filter) ─────────────────────────────────────
  const applyVideoFilter = (b: number, c: number) => {
    const video = videoRef.current
    if (video) video.style.filter = `brightness(${b}%) contrast(${c}%)`
  }

  const changeBrightness = (val: number) => {
    setBrightness(val)
    applyVideoFilter(val, contrast)
  }

  const changeContrast = (val: number) => {
    setContrast(val)
    applyVideoFilter(brightness, val)
  }

  const changeLanguage = (lang: 'fr' | 'en') => {
    setLanguage(lang)
    setShowSettings(false)

    const hls = hlsRef.current

    if (hls) {
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

  // ─── Episode lists ───────────────────────────────────────────────────────────

  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([])

  useEffect(() => {
    if (type !== 'series' || !tmdbId) return

    if (seriesDbId) {
      fetch(`/api/auth/admin/episodes?seriesId=${seriesDbId}`)
        .then(r => r.json())
        .then(async (data: Episode[]) => {
          if (data && data.length > 0) {
            setAllEpisodes(data)
          } else {
            await loadEpisodesFromTmdb()
          }
        })
        .catch(() => loadEpisodesFromTmdb())
    } else {
      loadEpisodesFromTmdb()
    }

    async function loadEpisodesFromTmdb() {
      try {
        const res = await fetch(`/api/content/series/${tmdbId}`)
        const d = await res.json()
        const seasons: number = d?.details?.number_of_seasons || 1
        const fakeEpisodes: Episode[] = []
        for (let s = 1; s <= seasons; s++) {
          const sr = await fetch(`/api/content/series/${tmdbId}?season=${s}`)
          if (!sr.ok) continue
          const sd = await sr.json()
          for (const ep of (sd.seasonData?.episodes || [])) {
            fakeEpisodes.push({
              id: ep.id,
              series_id: 0,
              season_number: ep.season_number,
              episode_number: ep.episode_number,
              title: ep.name || `Épisode ${ep.episode_number}`,
              video_url: null,
            } as any)
          }
        }
        if (fakeEpisodes.length > 0) setAllEpisodes(fakeEpisodes)
      } catch {}
    }
  }, [seriesDbId, tmdbId, type])

  const sortedEpisodes = [...allEpisodes].sort((a, b) =>
    a.season_number !== b.season_number ? a.season_number - b.season_number : a.episode_number - b.episode_number
  )
  const currentIdx = sortedEpisodes.findIndex(e => e.season_number === currentSeason && e.episode_number === currentEpisode)
  const prevEp = currentIdx > 0 ? sortedEpisodes[currentIdx - 1] : null
  const nextEp = currentIdx < sortedEpisodes.length - 1 ? sortedEpisodes[currentIdx + 1] : null
  const currentEpisodeStill = sortedEpisodes[currentIdx]?.still_path || null

  const getEpisodePlayUrl = (season: number, episode: number) => {
    const params = new URLSearchParams({
      season: String(season),
      episode: String(episode),
      play: '1',
    })

    return `/watch/series/${tmdbId}?${params.toString()}`
  }

  const navigateToEpisode = (season: number, episode: number) => {
    clearErrorTimer()
    setShowError(false)
    setEpisodeNotFound(false)
    setEpisodeNotFound(false)
    setFetchingEpisode(true)
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(() => {
      setFetchingEpisode(false)
      setEpisodeNotFound(true)
    }, 4000)
    setShowEpisodes(false)
    window.location.assign(getEpisodePlayUrl(season, episode))
  }

  const goToEpisode = (ep: Episode) => {
    navigateToEpisode(ep.season_number, ep.episode_number)
  }

  const handleSelectEpisodeFromApi = (season: number, episode: number, _episodeTitle: string) => {
    navigateToEpisode(season, episode)
  }

  const handleSelectEpisode = (season: number, episode: number, _url: string, _episodeTitle: string) => {
    navigateToEpisode(season, episode)
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  // ─── No video ────────────────────────────────────────────────────────────────
  if (!videoUrl && !fetchingEpisode && (type !== 'series' || !seriesDbId)) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center relative overflow-hidden">
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
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
              <Film className="w-9 h-9 text-zinc-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-white font-bold text-2xl tracking-tight">Contenu non disponible</h2>
            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
              Ce contenu n'a pas encore été ajouté par l'administrateur. Revenez plus tard.
            </p>
          </div>

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
      className="bg-black relative overflow-hidden player-fullscreen"
      onMouseMove={resetTimer}
      onMouseLeave={() => playing && !showEpisodes && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onClick={togglePlay}
      />

      {/* Écran pause — infos film/série */}
      <AnimatePresence>
        {!playing && !buffering && !fetchingEpisode && tmdbDetails && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)' }}
          >
            <div className="absolute left-10 max-w-lg" style={{ top: '50%', transform: 'translateY(-50%)' }}>
              {tmdbDetails.logo_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${tmdbDetails.logo_path}`}
                  alt={initialTitle}
                  className="max-h-28 max-w-xs object-contain mb-4 drop-shadow-2xl"
                  style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.8))' }}
                />
              ) : (
                <h2 className="text-white font-black text-5xl mb-4 leading-tight drop-shadow-2xl" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.9)' }}>
                  {initialTitle}
                </h2>
              )}
              <div className="flex items-center gap-3 mb-4">
                {tmdbDetails.release_date && (
                  <span className="text-white/60 text-sm font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    {new Date(tmdbDetails.release_date).getFullYear()}
                  </span>
                )}
                {tmdbDetails.runtime && (
                  <span className="text-white/60 text-sm font-medium">
                    {Math.floor(tmdbDetails.runtime / 60)}h {tmdbDetails.runtime % 60}m
                  </span>
                )}
                {tmdbDetails.vote_average > 0 && (
                  <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                    ★ {tmdbDetails.vote_average.toFixed(1)}
                  </span>
                )}
              </div>
              {tmdbDetails.overview && (
                <p className="text-white/70 text-sm leading-relaxed line-clamp-3 max-w-md">
                  {tmdbDetails.overview}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fetching episode — spinner pendant la recherche Purstream */}
      <AnimatePresence>
        {fetchingEpisode && !episodeNotFound && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          >
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <p className="text-white/50 text-sm font-medium">{displayTitle}</p>
            <p className="text-white/30 text-xs">Chargement de l'épisode...</p>
          </motion.div>
        )}
        {episodeNotFound && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center px-6"
          >
            {/* Fond : still de l'épisode courant ou précédent */}
            {(currentEpisodeStill || (prevEp?.still_path)) && (
              <>
                <img
                  src={`https://image.tmdb.org/t/p/w1280${currentEpisodeStill || prevEp?.still_path}`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: 'brightness(0.18) saturate(0.6)' }}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.3) 100%)' }} />
              </>
            )}
            {!(currentEpisodeStill || prevEp?.still_path) && (
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }} />
            )}

            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 0.1 }}
              className="relative z-10 flex flex-col items-center text-center w-full"
              style={{ maxWidth: 380 }}
            >
              {/* Titre */}
              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'sans-serif', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>
                Épisode indisponible
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                style={{ color: 'white', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 12, fontFamily: 'sans-serif' }}>
                Cet épisode n'est<br/>pas encore disponible
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.6, marginBottom: 36, fontFamily: 'sans-serif', maxWidth: 300 }}>
                Tu seras automatiquement notifié dès que cet épisode sera mis en ligne.
              </motion.p>

              {/* Bouton épisode précédent */}
              {prevEp && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  onClick={() => goToEpisode(prevEp)}
                  className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                >
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  Retour à l'épisode précédent
                </motion.button>
              )}
              {!prevEp && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  onClick={() => setEpisodeNotFound(false)}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white/70 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            </motion.div>
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
                <Link href={backUrl} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white transition-colors text-center"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Retour
                </Link>
                <button
                  onClick={() => { setShowError(false); if (videoUrl) loadVideo(videoUrl) }}
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

      {/* Buffering spinner (mid-play only) */}
      <AnimatePresence>
        {buffering && !fetchingEpisode && !episodeNotFound && (
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
        {!playing && !buffering && !fetchingEpisode && (
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

      {/* Prev / Next episode buttons — series only */}
      {type === 'series' && (
        <AnimatePresence>
          {showControls && !fetchingEpisode && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none">
              <button
                onClick={() => prevEp && goToEpisode(prevEp)}
                disabled={!prevEp}
                className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center border transition-all backdrop-blur-sm ${prevEp ? 'bg-black/50 border-white/20 text-white hover:bg-white/20' : 'bg-black/20 border-white/10 text-white/20 cursor-not-allowed'}`}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
              </button>
              <div className="w-24 h-24" />
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

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && !fetchingEpisode && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-between pointer-events-none"
          >
            {/* Top bar */}
            <div className="pointer-events-auto px-6 pt-5 pb-16 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center gap-4">
              <Link href={backUrl} className="shrink-0">
                <button className="w-10 h-10 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white transition-all duration-200 active:scale-95">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <h1 className="text-white font-semibold text-base truncate drop-shadow-lg flex-1">{displayTitle}</h1>

              {type === 'series' && (
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
              <p className="text-white/50 text-xs font-medium mb-2 truncate">{displayTitle}</p>

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
                  <div className="absolute -top-8 bg-black/80 text-white text-xs px-2 py-1 rounded-lg pointer-events-none -translate-x-1/2 whitespace-nowrap" style={{ left: hoverX }}>
                    {fmt(hoverTime)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 min-w-0">
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

                <div className="hidden sm:flex items-center gap-1 ml-1" onMouseEnter={() => setShowVol(true)} onMouseLeave={() => setShowVol(false)}>
                  <button onClick={toggleMute} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                    {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <AnimatePresence>
                    {showVol && (
                      <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 80, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden">
                        <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={e => changeVolume(+e.target.value)} className="w-20 accent-primary cursor-pointer" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <span className="text-white/50 text-sm font-mono ml-1 sm:ml-2 tabular-nums text-xs sm:text-sm">
                  {fmt(currentTime)} / {fmt(duration)}
                </span>

                <div className="flex-1" />

                {type === 'series' && (
                  <button onClick={() => setShowEpisodes(true)} className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all">
                    <List className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={() => {
                    // @ts-ignore
                    if (videoRef.current?.webkitShowPlaybackTargetPicker) videoRef.current.webkitShowPlaybackTargetPicker()
                  }}
                  className="hidden sm:flex text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all"
                >
                  <Cast className="w-5 h-5" />
                </button>

                {tmdbId && (
                  <button
                    disabled={isDownloading}
                    onClick={e => {
                      e.stopPropagation()
                      if (isDownloading) return
                      if (!userId) { setShowLoginPrompt(true); return }
                      triggerDownload()
                    }}
                    className="text-white/70 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
                    title="Télécharger"
                  >
                    {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  </button>
                )}

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
                        <div className="flex items-center justify-between" style={{ padding: '14px 18px 10px' }}>
                          <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em' }}>RÉGLAGES</span>
                          <button onClick={() => setShowSettings(false)} style={{ color: 'rgba(255,255,255,0.45)' }} className="hover:text-white transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          {(['audio', 'subtitles', 'effects'] as const).map(tab => (
                            <button
                              key={tab}
                              onClick={() => setSettingsTab(tab)}
                              className="relative transition-colors"
                              style={{
                                flex: 1,
                                padding: '9px 0 10px',
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: settingsTab === tab ? '#fff' : 'rgba(255,255,255,0.32)',
                              }}
                            >
                              {tab === 'audio' ? 'AUDIO' : tab === 'subtitles' ? 'SOUS-TITRES' : 'EFFETS'}
                              {settingsTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0" style={{ height: '2px', background: '#1d6fe8' }} />
                              )}
                            </button>
                          ))}
                        </div>

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
                                    background: active ? '#1d6fe8' : 'rgba(255,255,255,0.28)',
                                  }} />
                                  <span style={{
                                    fontSize: '13px',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? '#1d6fe8' : 'rgba(255,255,255,0.82)',
                                  }}>
                                    {lang === 'fr' ? 'Français' : 'Anglais'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        ) : settingsTab === 'subtitles' ? (
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
                                    background: active ? '#1d6fe8' : 'rgba(255,255,255,0.28)',
                                  }} />
                                  <span style={{
                                    fontSize: '13px',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? '#1d6fe8' : 'rgba(255,255,255,0.82)',
                                  }}>
                                    {sub === 'off' ? 'Désactivés' : sub === 'fr' ? 'FR Full · SRT' : 'ENG Full · SRT'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          /* ── Onglet EFFETS ── */
                          <div style={{ padding: '12px 18px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Son amplifié */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)' }}>
                                  SON AMPLIFIÉ
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: audioBoost > 100 ? '#1d6fe8' : 'rgba(255,255,255,0.7)' }}>
                                  {audioBoost}%
                                </span>
                              </div>
                              <input
                                type="range" min={100} max={300} step={10}
                                value={audioBoost}
                                onChange={e => changeAudioBoost(Number(e.target.value))}
                                className="w-full accent-red-600 cursor-pointer"
                                style={{ height: '4px' }}
                              />
                              <div className="flex justify-between mt-1">
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Normal</span>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>×3</span>
                              </div>
                              {audioBoost > 100 && (
                                <button
                                  onClick={() => changeAudioBoost(100)}
                                  style={{ fontSize: '10px', color: '#1d6fe8', marginTop: '4px' }}
                                  className="hover:underline"
                                >
                                  Réinitialiser
                                </button>
                              )}
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

                            {/* Luminosité */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)' }}>
                                  LUMINOSITÉ
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: brightness !== 100 ? '#1d6fe8' : 'rgba(255,255,255,0.7)' }}>
                                  {brightness}%
                                </span>
                              </div>
                              <input
                                type="range" min={50} max={200} step={5}
                                value={brightness}
                                onChange={e => changeBrightness(Number(e.target.value))}
                                className="w-full accent-red-600 cursor-pointer"
                                style={{ height: '4px' }}
                              />
                              <div className="flex justify-between mt-1">
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Sombre</span>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Vif</span>
                              </div>
                            </div>

                            {/* Contraste */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)' }}>
                                  CONTRASTE
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: contrast !== 100 ? '#1d6fe8' : 'rgba(255,255,255,0.7)' }}>
                                  {contrast}%
                                </span>
                              </div>
                              <input
                                type="range" min={50} max={200} step={5}
                                value={contrast}
                                onChange={e => changeContrast(Number(e.target.value))}
                                className="w-full accent-red-600 cursor-pointer"
                                style={{ height: '4px' }}
                              />
                              <div className="flex justify-between mt-1">
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Plat</span>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Intense</span>
                              </div>
                            </div>

                            {/* Bouton reset tout */}
                            {(brightness !== 100 || contrast !== 100) && (
                              <button
                                onClick={() => { changeBrightness(100); changeContrast(100) }}
                                style={{
                                  fontSize: '11px', color: 'rgba(255,255,255,0.4)',
                                  textAlign: 'center', padding: '6px',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '6px',
                                }}
                                className="hover:text-white hover:border-white/30 transition-colors"
                              >
                                Réinitialiser l'image
                              </button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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
        {showEpisodes && tmdbId && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black z-40"
              onClick={() => setShowEpisodes(false)}
            />
            <EpisodesPanel
              seriesDbId={seriesDbId}
              tmdbId={tmdbId!}
              currentSeason={currentSeason}
              currentEpisode={currentEpisode}
              onClose={() => setShowEpisodes(false)}
              onSelectEpisode={handleSelectEpisode}
              onSelectEpisodeApi={handleSelectEpisodeFromApi}
            />
          </>
        )}
      </AnimatePresence>

      {/* Modale "Téléchargement indisponible" */}
      <AnimatePresence>
        {showUnavailable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={() => setShowUnavailable(false)}
          >
            {/* Fond flouté */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Fond dégradé avec poster en arrière-plan */}
              <div className="relative">
                {unavailablePoster && (
                  <div
                    className="absolute inset-0 bg-cover bg-center scale-110 blur-sm opacity-30"
                    style={{ backgroundImage: `url(${unavailablePoster})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/60 via-zinc-900/90 to-zinc-900" />

                <div className="relative z-10 flex flex-col items-center gap-5 p-8 text-center">
                  {/* Poster dans le rond */}
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-full ring-2 ring-white/20 overflow-hidden shadow-lg">
                    {unavailablePoster
                      ? <img src={unavailablePoster} alt="poster" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-white/10" />
                    }
                    <div className="absolute inset-0 rounded-full animate-ping bg-white/5" />
                  </div>

                  {/* Titre */}
                  <div>
                    <h3 className="text-white font-semibold text-lg tracking-tight">
                      Téléchargement indisponible
                    </h3>
                    <p className="mt-1.5 text-white/55 text-sm leading-relaxed">
                      Ce contenu n&apos;est pas encore disponible au téléchargement.
                      Revenez plus tard ou regardez-le en streaming.
                    </p>
                  </div>

                  {/* Bouton fermer */}
                  <button
                    onClick={() => setShowUnavailable(false)}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-sm font-medium transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

            {/* Modale "Connexion requise" — affichée quand on clique sur télécharger sans session */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="mx-4 rounded-2xl p-8 flex flex-col items-center text-center max-w-sm w-full"
              style={{ background: 'rgba(18,8,8,0.95)', border: '1px solid rgba(229,9,20,0.3)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                style={{ background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)' }}>
                <Lock className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Connexion requise</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Vous devez être connecté pour télécharger ce contenu.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white transition-colors text-center"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={goToLoginForDownload}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
                  style={{ background: 'rgba(229,9,20,0.85)', border: '1px solid rgba(229,9,20,0.5)' }}
                >
                  <LogIn className="w-4 h-4" />
                  Connexion
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
