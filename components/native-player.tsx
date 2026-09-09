'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, SkipBack, SkipForward, Cast,
  Film, Loader2, List, X, ChevronLeft, ChevronRight, Settings, Download,
  Lock, LogIn
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Hls from 'hls.js'
import { cinflixStreamApiUrl, isCinflixApiUrl } from '@/lib/cinflix-url'

function isWebKitSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOS = /iP(hone|od|ad)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const safari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Android/i.test(ua)
  return iOS || safari
}

function safariMediaUrl(raw: string) {
  if (!raw.includes('.m3u8') || raw.includes('/api/hls/')) return raw
  const origin = window.location.hostname === 'streamself.dev'
    ? `${window.location.protocol}//www.streamself.dev`
    : window.location.origin
  return `${origin}/api/hls/master.m3u8?url=${encodeURIComponent(raw)}&direct=1`
}

function withCinflixReferer(mediaUrl: string) {
  if (mediaUrl.includes('/api/proxy-download')) return mediaUrl
  return `/api/proxy-download?url=${encodeURIComponent(mediaUrl)}`
}

function blinkMp4From(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    if (url.includes('/api/proxy-download')) {
      const inner = new URL(url, window.location.origin).searchParams.get('url')
      return blinkMp4From(inner)
    }
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('blink-n3') && url.includes('.mp4')) return url
  } catch {}
  return null
}

function blinkFromPerformance(): string | null {
  try {
    const entries = performance.getEntriesByType('resource')
    for (let i = entries.length - 1; i >= 0; i--) {
      const found = blinkMp4From(entries[i].name)
      if (found) return found
    }
  } catch {}
  return null
}

function probeCinflixNetwork(apiUrl: string) {
  const probe = new URL(apiUrl)
  probe.searchParams.set('_', String(Date.now()))
  const probeUrl = probe.toString()
  const img = new Image()
  img.referrerPolicy = 'no-referrer'
  img.src = probeUrl
  const ctrl = new AbortController()
  fetch(probeUrl, {
    mode: 'no-cors',
    redirect: 'follow',
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: ctrl.signal,
  }).catch(() => {})
  window.setTimeout(() => {
    img.src = ''
    try { ctrl.abort() } catch {}
  }, 3000)
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'CINFLIX_PROBE' && typeof event.data.url === 'string') {
      probeCinflixNetwork(event.data.url)
    }
  })
}

function ensureCinflixSw(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(false)
  return (async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw-cinflix.js?v=12', { scope: '/', updateViaCache: 'none' })
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      await navigator.serviceWorker.ready
      if (navigator.serviceWorker.controller) return true
      await Promise.race([
        new Promise<void>(resolve => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
        }),
        new Promise<void>(resolve => window.setTimeout(resolve, 2000)),
      ])
      return !!navigator.serviceWorker.controller
    } catch {
      return false
    }
  })()
}

async function resolveCinflixFromPhone(apiUrl: string): Promise<string | null> {
  await ensureCinflixSw()
  const probe = new URL(apiUrl)
  probe.searchParams.set('_', String(Date.now()))
  const probeUrl = probe.toString()

  return new Promise(resolve => {
    let done = false
    let channel: BroadcastChannel | null = null
    const img = new Image()
    const fetchCtrl = new AbortController()

    const finish = (found: string | null) => {
      if (done) return
      done = true
      navigator.serviceWorker.removeEventListener('message', onMsg)
      try { channel?.close() } catch {}
      window.clearTimeout(timer)
      window.clearTimeout(fetchCut)
      img.onload = null
      img.onerror = null
      img.src = ''
      try { fetchCtrl.abort() } catch {}
      resolve(found)
    }

    const onMsg = (event: MessageEvent) => {
      const found = blinkMp4From(typeof event.data?.url === 'string' ? event.data.url : '')
      if (found) finish(found)
    }

    navigator.serviceWorker.addEventListener('message', onMsg)
    try {
      channel = new BroadcastChannel('cinflix-blink')
      channel.onmessage = onMsg
    } catch {}

    img.referrerPolicy = 'no-referrer'
    img.onload = () => {
      const found = blinkFromPerformance()
      if (found) finish(found)
    }
    img.onerror = () => {
      const found = blinkFromPerformance()
      if (found) finish(found)
    }
    img.src = probeUrl

    fetch(probeUrl, {
      mode: 'no-cors',
      redirect: 'follow',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: fetchCtrl.signal,
    }).catch(() => {})

    const fetchCut = window.setTimeout(() => {
      try { fetchCtrl.abort() } catch {}
    }, 2500)

    const timer = window.setTimeout(() => finish(blinkFromPerformance()), 7000)
  })
}

async function resolveCinflixSrc(url: string): Promise<string | null> {
  const known = blinkMp4From(url)
  if (known) return withCinflixReferer(known)

  let raw = url
  if (raw.includes('/api/proxy-download')) {
    try {
      const inner = new URL(raw, window.location.origin).searchParams.get('url')
      if (inner) raw = inner
    } catch {}
  }
  const innerBlink = blinkMp4From(raw)
  if (innerBlink) return withCinflixReferer(innerBlink)
  if (!isCinflixApiUrl(raw)) return null

  await ensureCinflixSw()

  try {
    const u = new URL(raw)
    const params = new URLSearchParams({
      type: u.searchParams.get('type') || 'movie',
      id: u.searchParams.get('id') || '',
    })
    const season = u.searchParams.get('s')
    const episode = u.searchParams.get('e')
    if (season) params.set('s', season)
    if (episode) params.set('e', episode)
    const res = await fetch(`/api/cinflix-resolve?${params}`)
    const data = await res.json().catch(() => null)
    const media = typeof data?.url === 'string' ? data.url : null
    if (media && !isCinflixApiUrl(media)) {
      return media.includes('/api/proxy-download') ? media : withCinflixReferer(media)
    }
  } catch {}
    const u = new URL(raw)
    const params = new URLSearchParams({
      type: u.searchParams.get('type') || 'movie',
      id: u.searchParams.get('id') || '',
    })
    const season = u.searchParams.get('s')
    const episode = u.searchParams.get('e')
    if (season) params.set('s', season)
    if (episode) params.set('e', episode)
    const res = await fetch(`/api/cinflix-resolve?${params}`)
    const data = await res.json().catch(() => null)
    const media = typeof data?.url === 'string' ? data.url : null
    if (media && !isCinflixApiUrl(media)) {
      return media.includes('/api/proxy-download') ? media : withCinflixReferer(media)
    }
  } catch {}

  const fromPhone = await resolveCinflixFromPhone(raw)
  return fromPhone ? withCinflixReferer(fromPhone) : null
}

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
  year?: number | null
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
      transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      className="absolute inset-y-0 right-0 w-full sm:w-[420px] z-50 flex flex-col"
      style={{ background: 'linear-gradient(180deg, rgba(8,8,10,0.97), rgba(8,8,10,0.92))', backdropFilter: 'blur(28px)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-5 pt-6 pb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.22em] uppercase text-white/35 mb-1">Catalogue</p>
          <h2 className="text-white text-2xl font-black tracking-tight">Épisodes</h2>
          <p className="text-white/40 text-xs mt-1">{episodes.length} titres</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/14 border border-white/10 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="px-5 pb-3 flex gap-2 overflow-x-auto hide-scrollbar">
        {seasons.map(s => {
          const active = s === selectedSeason
          return (
            <button
              key={s}
              type="button"
              onClick={() => { setSelectedSeason(s) }}
              className={`shrink-0 h-9 px-4 rounded-full text-xs font-bold tracking-wide transition-all ${
                active ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
              }`}
            >
              Saison {s}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          </div>
        ) : filteredEps.length === 0 ? (
          <p className="text-white/40 text-center py-16 text-sm">Aucun épisode</p>
        ) : (
          <div className="space-y-2">
            {filteredEps.map(ep => {
              const isCurrent = ep.season_number === currentSeason && ep.episode_number === currentEpisode
              const epTitle = ep.title || `Épisode ${ep.episode_number}`
              return (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => {
                    if (ep.video_url) onSelectEpisode(ep.season_number, ep.episode_number, ep.video_url, epTitle)
                    else onSelectEpisodeApi(ep.season_number, ep.episode_number, epTitle)
                  }}
                  className={`w-full flex gap-3 p-2 rounded-2xl text-left transition-all ${
                    isCurrent ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/6'
                  }`}
                >
                  <div className="relative w-[118px] aspect-video rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                    {ep.still_path ? (
                      <Image src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt={epTitle} fill className="object-cover" sizes="118px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-5 h-5 text-white/20" />
                      </div>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-black text-white/90 px-1.5 py-0.5 rounded-md bg-black/70">
                      {ep.episode_number}
                    </span>
                    {isCurrent && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-black fill-black ml-0.5" />
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className={`font-bold text-sm truncate ${isCurrent ? 'text-white' : 'text-white/90'}`}>{epTitle}</p>
                    <p className="text-white/40 text-[11px] mt-0.5">
                      {ep.runtime ? `${ep.runtime} min` : `Épisode ${ep.episode_number}`}
                      {isCurrent ? ' · En cours' : ''}
                    </p>
                    {ep.overview && <p className="text-white/35 text-[11px] line-clamp-2 mt-1 leading-relaxed">{ep.overview}</p>}
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
  year = null,
}: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const sourceUrlRef = useRef<string | null>(null)
  const proxyTriedRef = useRef(false)
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
  const safariRef = useRef(false)
  const iosRef = useRef(false)
  const loadGenRef = useRef(0)
  const [safariReady, setSafariReady] = useState(false)

  useEffect(() => {
    safariRef.current = isWebKitSafari()
    iosRef.current = /iP(hone|od|ad)/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setSafariReady(true)
  }, [])

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [buffering, setBuffering] = useState(true)
  const [fetchingEpisode, setFetchingEpisode] = useState(() => !initialVideoUrl && !!tmdbId)
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

  // ─── Save watch progress ───────────────────────────────────────────────────�������─
  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const currentSeasonRef = useRef(initialSeason)
  const currentEpisodeRef = useRef(initialEpisode)
  const titleRef = useRef(initialTitle)
  const resumeTimeRef = useRef(0)
  const resumeAppliedRef = useRef(false)
  const goBack = useCallback(() => {
    const v = videoRef.current
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    if (v) {
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
    window.location.replace(backUrl)
  }, [backUrl])

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
    if (!tmdbId) return
    const param = profileId ? `profile_id=${profileId}` : userId ? `user_id=${userId}` : ''
    fetch(`/api/watch-history${param ? `?${param}` : ''}`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return
        const match = data.find(item =>
          (item.tmdb_id ?? item.content_id) === tmdbId &&
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
    const ct = currentTimeRef.current
    const dur = durationRef.current
    if (dur < 10) return
    const progress = Math.round((ct / dur) * 100)
    try {
      await fetch('/api/watch-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profileId ? null : userId || null,
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
    const interval = setInterval(saveProgress, 30000)
    return () => clearInterval(interval)
  }, [saveProgress])

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
    const gen = ++loadGenRef.current

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    setHlsAudioTracks([])

    v.pause()
    v.playsInline = true
    v.setAttribute('playsinline', '')
    v.setAttribute('webkit-playsinline', 'true')
    resumeAppliedRef.current = false
    sourceUrlRef.current = url
    proxyTriedRef.current = false

    setBuffering(true)
    setPlaying(false)
    setShowError(false)

    v.muted = false
    setMuted(false)

    const isHls = url.includes('.m3u8')

    const playSrc = () => {
      v.muted = false
      setMuted(false)
      startErrorTimer()
      v.play()?.catch(() => {
        cancelErrorTimer()
        setBuffering(false)
        setPlaying(false)
      })
    }

    if (isHls && Hls.isSupported() && !safariRef.current) {
      startErrorTimer()
      const hls = new Hls({ enableWorker: true, xhrSetup: (xhr) => {
        xhr.withCredentials = false
      }})
      hlsRef.current = hls
      hls.loadSource(safariMediaUrl(url))
      hls.attachMedia(v)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
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
        playSrc()
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
      return
    }

    void (async () => {
      if (gen !== loadGenRef.current) return

      let playUrl = safariMediaUrl(url)
      const cinflixSrc = await resolveCinflixSrc(url)
      if (gen !== loadGenRef.current) return
      if (cinflixSrc) {
        playUrl = cinflixSrc
        proxyTriedRef.current = true
      } else if (isCinflixApiUrl(url)) {
        setBuffering(false)
        setPlaying(false)
        setShowError(true)
        return
      }

      if (gen !== loadGenRef.current) return
      v.removeAttribute('src')
      while (v.firstChild) v.removeChild(v.firstChild)
      v.src = playUrl
      v.load()
      playSrc()
    })()
  }, [startErrorTimer, clearErrorTimer, cancelErrorTimer])

  // ─── Mount & video events ───────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    syncVideoState(v)

    const onTimeUpdate = () => {
      syncVideoState(v)
    }
    const applyResume = () => {
      if (resumeAppliedRef.current || !(v.duration > 0)) return
      const saved = resumeTimeRef.current
      if (!(saved > 2 && saved < 98)) {
        resumeAppliedRef.current = true
        resumeTimeRef.current = 0
        return
      }
      resumeAppliedRef.current = true
      resumeTimeRef.current = 0
      v.currentTime = (saved / 100) * v.duration
      syncVideoState(v)
    }
    const onMeta = () => {
      syncVideoState(v)
      for (let i = 0; i < v.textTracks.length; i++) {
        v.textTracks[i].mode = 'disabled'
      }
      if (v.duration > 0) clearErrorTimer()
    }
    const onPlay = () => {
      v.muted = false
      setMuted(false)
      syncVideoState(v)
      resetTimer()
    }
    const onPlaying = () => {
      syncVideoState(v)
      setBuffering(false)
      setShowError(false)
      clearErrorTimer()
      applyResume()
    }
    const onPause = () => { syncVideoState(v); setBuffering(false); setShowControls(true) }
    const onEnded = () => { syncVideoState(v); setBuffering(false); setShowControls(true) }
    const onWaiting = () => {
      if (v.readyState < 3) setBuffering(true)
    }
    const onCanPlay = () => {
      syncVideoState(v)
      setBuffering(false)
    }
    const onError = () => {
      if (proxyTriedRef.current) {
        setBuffering(false)
        setPlaying(false)
        return
      }
      const redirected = blinkMp4From(v.currentSrc)
        || blinkMp4From(v.src)
        || blinkFromPerformance()
        || blinkMp4From(sourceUrlRef.current)
      if (redirected) {
        proxyTriedRef.current = true
        setBuffering(true)
        v.src = withCinflixReferer(redirected)
        v.load()
        v.muted = false
        setMuted(false)
        v.play()?.catch(() => {
          setBuffering(false)
          setPlaying(false)
        })
        return
      }
      const raw = sourceUrlRef.current
      if (raw && /^https?:/i.test(raw) && !raw.includes('/api/proxy-download') && !raw.includes('.m3u8') && !raw.includes('cinflix.xyz')) {
        proxyTriedRef.current = true
        setBuffering(true)
        v.src = `/api/proxy-download?url=${encodeURIComponent(raw)}&filename=video.mp4`
        v.muted = false
        setMuted(false)
        v.play()?.catch(() => {
          setBuffering(false)
          setPlaying(false)
        })
        return
      }
      setBuffering(false)
      setPlaying(false)
    }
    const onProgress = () => {
      if (v.buffered.length > 0 && v.duration > 0) {
        setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)
      }
    }

    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('playing', onPlaying)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onEnded)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('canplay', onCanPlay)
    v.addEventListener('canplaythrough', onCanPlay)
    v.addEventListener('durationchange', onMeta)
    v.addEventListener('progress', onProgress)
    v.addEventListener('error', onError)
    v.addEventListener('stalled', onWaiting)

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('canplay', onCanPlay)
      v.removeEventListener('canplaythrough', onCanPlay)
      v.removeEventListener('durationchange', onMeta)
      v.removeEventListener('progress', onProgress)
      v.removeEventListener('error', onError)
      v.removeEventListener('stalled', onWaiting)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [resetTimer, clearErrorTimer, syncVideoState])

  // ─── Si série en DB mais épisode sans URL → overlay immédiat si pas de tmdbId
  useEffect(() => {
    if (type !== 'series' || !seriesDbId || initialVideoUrl || tmdbId) return
    setEpisodeNotFound(true)
  }, [])

  // ─── Purstream : délègue à l'API route + timeout si rien ne joue ─────────
  useEffect(() => {
    if (initialVideoUrl || !tmdbId) return
    const contentTitle = seriesName || initialTitle

    setEpisodeNotFound(false)
    setFetchingEpisode(true)
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(() => {
      setFetchingEpisode(false)
      setEpisodeNotFound(true)
    }, 25000)

    ;(async () => {
      try {
        const params = new URLSearchParams({
          title: contentTitle,
          type,
          tmdb_id: String(tmdbId),
          ...(year && { year: String(year) }),
          ...(type === 'series' && { season: String(initialSeason || 1), episode: String(initialEpisode || 1) }),
        })
        const res = await fetch(`/api/purstream?${params}`)
        const data = await res.json().catch(() => null)
        if (data?.videoUrl) {
          if (fetchTimeoutRef.current) { clearTimeout(fetchTimeoutRef.current); fetchTimeoutRef.current = null }
          setEpisodeNotFound(false)
          setFetchingEpisode(false)
          setVideoUrl(data.videoUrl)
          return
        }
        const cinflix = cinflixStreamApiUrl(
          type === 'movie' ? 'movie' : 'tv',
          tmdbId,
          initialSeason,
          initialEpisode,
        )
        if (fetchTimeoutRef.current) { clearTimeout(fetchTimeoutRef.current); fetchTimeoutRef.current = null }
        setEpisodeNotFound(false)
        setFetchingEpisode(false)
        setVideoUrl(cinflix)
        return
      } catch (err) {
        console.error('[Purstream]', err)
        const cinflix = cinflixStreamApiUrl(
          type === 'movie' ? 'movie' : 'tv',
          tmdbId,
          initialSeason,
          initialEpisode,
        )
        if (fetchTimeoutRef.current) { clearTimeout(fetchTimeoutRef.current); fetchTimeoutRef.current = null }
        setEpisodeNotFound(false)
        setFetchingEpisode(false)
        setVideoUrl(cinflix)
        return
      }
      setFetchingEpisode(false)
      if (type === 'series') setEpisodeNotFound(true)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId])

  // Load video whenever videoUrl changes
  useEffect(() => {
    if (!safariReady || !videoUrl) return
    if (fetchTimeoutRef.current) { clearTimeout(fetchTimeoutRef.current); fetchTimeoutRef.current = null }
    setEpisodeNotFound(false)
    loadVideo(videoUrl)
    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [videoUrl, loadVideo, safariReady])

  // Si la durée est là mais aucune image au bout de 4s (typique Safari),
  // on retente via le proxy Referer au lieu de rester coincé à 0:00.
  useEffect(() => {
    if (safariRef.current || !buffering || !videoUrl) return
    const t = window.setTimeout(() => {
      const v = videoRef.current
      const raw = sourceUrlRef.current
      if (!v || !raw || proxyTriedRef.current || v.seeking) return
      if (raw.includes('.m3u8') || isCinflixApiUrl(raw)) return
      if (raw.includes('/api/proxy-download')) return
      if (!(v.duration > 0) || v.currentTime > 0.2) return
      proxyTriedRef.current = true
      v.src = withCinflixReferer(raw)
      v.muted = false
      setMuted(false)
      v.play()?.catch(() => {
        setBuffering(false)
        setPlaying(false)
      })
    }, 4000)
    return () => window.clearTimeout(t)
  }, [buffering, videoUrl])

  // Fullscreen listener
  useEffect(() => {
    const v = videoRef.current
    const handler = () => {
      const displaying = (v as HTMLVideoElement & { webkitDisplayingFullscreen?: boolean })?.webkitDisplayingFullscreen
      setFullscreen(!!document.fullscreenElement || !!displaying)
    }
    document.addEventListener('fullscreenchange', handler)
    v?.addEventListener('webkitbeginfullscreen', handler)
    v?.addEventListener('webkitendfullscreen', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      v?.removeEventListener('webkitbeginfullscreen', handler)
      v?.removeEventListener('webkitendfullscreen', handler)
    }
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
      v.muted = false
      setMuted(false)
      startErrorTimer()
      v.play()?.catch(() => {
        cancelErrorTimer()
        setBuffering(false)
        setPlaying(false)
      })
    } else {
      v.pause()
    }
  }

  // Tap sur la surface vidéo : si les contrôles sont masqués, on les révèle
  // seulement (sans lancer/mettre en pause à l'aveugle). S'ils sont déjà
  // visibles, le tap bascule la lecture. Corrige les taps "fantômes" sur mobile.
  const handleSurfaceTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a, input, textarea, [data-no-surface]')) return
    if (!showControls) { resetTimer(); return }
    togglePlay()
    resetTimer()
  }

  const skip = (s: number) => {
    const v = videoRef.current
    if (v) {
      const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : duration
      v.currentTime = Math.max(0, Math.min(dur, v.currentTime + s))
      resetTimer()
    }
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
    if (audioCtxRef.current) return
    if (isWebKitSafari()) return
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
    const v = videoRef.current
    const el = containerRef.current
    if (!v) return

    if (iosRef.current) {
      const enter = (v as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen
      try { enter?.call(v) } catch {}
      return
    }

    if (document.fullscreenElement) {
      document.exitFullscreen?.()
      return
    }

    const req = (v.requestFullscreen || el?.requestFullscreen)?.bind(safariRef.current ? v : el || v)
    req?.().catch(() => {
      const enter = (v as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen
      try { enter?.call(v) } catch {}
    })
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    seekAt(e.clientX)
  }

  const seekAt = (clientX: number) => {
    const v = videoRef.current
    const bar = progressRef.current
    if (!v || !bar) return
    const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : duration
    if (!(dur > 0) || !Number.isFinite(dur)) return
    const pct = Math.max(0, Math.min(1, (clientX - bar.getBoundingClientRect().left) / bar.offsetWidth))
    const next = pct * dur
    v.currentTime = next
    setCurrentTime(next)
    currentTimeRef.current = next
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
    let cancelled = false

    async function load() {
      if (seriesDbId) {
        try {
          const r = await fetch(`/api/auth/admin/episodes?seriesId=${seriesDbId}`)
          const data: Episode[] = await r.json()
          if (!cancelled && data && data.length > 0) {
            setAllEpisodes(data)
            return
          }
        } catch {}
      }
      try {
        const sr = await fetch(`/api/content/series/${tmdbId}?season=${currentSeason}`)
        if (!sr.ok) return
        const sd = await sr.json()
        const fakeEpisodes: Episode[] = (sd.seasonData?.episodes || []).map((ep: any) => ({
          id: ep.id,
          series_id: 0,
          season_number: ep.season_number,
          episode_number: ep.episode_number,
          title: ep.name || `Épisode ${ep.episode_number}`,
          still_path: ep.still_path || null,
          video_url: null,
        }))
        if (!cancelled && fakeEpisodes.length > 0) setAllEpisodes(fakeEpisodes)
      } catch {}
    }

    load()
    return () => { cancelled = true }
  }, [seriesDbId, tmdbId, type, currentSeason])

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
    }, 25000)
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
  const remaining = Math.max(0, duration - currentTime)
  const seriesTag = type === 'series' ? `S${String(currentSeason).padStart(2, '0')} · E${String(currentEpisode).padStart(2, '0')}` : null

  if (!videoUrl && !fetchingEpisode && (type !== 'series' || !seriesDbId)) {
    return (
      <div className="player-fullscreen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        {poster && (
          <Image src={poster} alt="" fill className="object-cover opacity-25 blur-2xl scale-110" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50" />
        <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/12 flex items-center justify-center">
            <Film className="w-7 h-7 text-white/50" />
          </div>
          <h2 className="text-white font-black text-3xl tracking-tight">Indisponible</h2>
          <p className="text-white/45 text-sm leading-relaxed">
            Ce titre n’est pas encore lisible. Revenez plus tard ou ouvrez la fiche.
          </p>
          <Link href={backUrl} className="mt-2 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-black text-sm font-bold">
            <ArrowLeft className="w-4 h-4" />
            Retour à la fiche
          </Link>
        </div>
      </div>
    )
  }

  // ��── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`bg-black relative overflow-hidden player-fullscreen ${showControls ? '' : 'cursor-none'}`}
      style={{ touchAction: 'manipulation' }}
      onMouseMove={resetTimer}
      onClick={handleSurfaceTap}
    >
      <style>{`
        .np-slider{-webkit-appearance:none;appearance:none;height:3px;background:rgba(255,255,255,.22);border-radius:99px;outline:none}
        .np-slider::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:99px;background:#fff;cursor:pointer}
      `}</style>
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        preload="auto"
        controlsList="nodownload"
      />
      <button
        type="button"
        onClick={goBack}
        className="absolute z-[90] w-11 h-11 rounded-full flex items-center justify-center bg-black/55 border border-white/15 text-white"
        style={{ top: 'max(12px, env(safe-area-inset-top, 0px))', left: 16 }}
        aria-label="Retour"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {!playing && !buffering && !fetchingEpisode && tmdbDetails && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-[16]"
            style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.28) 42%, transparent 70%)' }}
          >
            <div className="absolute left-8 md:left-14 top-1/2 -translate-y-[58%] max-w-md">
              {tmdbDetails.logo_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${tmdbDetails.logo_path}`}
                  alt={initialTitle}
                  className="max-h-24 md:max-h-32 max-w-[70%] object-contain mb-5 drop-shadow-2xl"
                />
              ) : (
                <h2 className="text-white font-black text-4xl md:text-5xl mb-4 leading-[0.95] tracking-tight">{initialTitle}</h2>
              )}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {seriesTag && (
                  <span className="text-[11px] font-black tracking-widest uppercase text-black bg-white rounded-full px-2.5 py-1">{seriesTag}</span>
                )}
                {tmdbDetails.release_date && (
                  <span className="text-white/70 text-sm font-semibold">{new Date(tmdbDetails.release_date).getFullYear()}</span>
                )}
                {tmdbDetails.runtime ? (
                  <span className="text-white/45 text-sm">{Math.floor(tmdbDetails.runtime / 60)}h{String(tmdbDetails.runtime % 60).padStart(2, '0')}</span>
                ) : null}
                {tmdbDetails.vote_average > 0 && (
                  <span className="text-amber-400 text-sm font-bold">★ {tmdbDetails.vote_average.toFixed(1)}</span>
                )}
              </div>
              {tmdbDetails.overview && (
                <p className="hidden md:block text-white/60 text-sm leading-relaxed line-clamp-3">{tmdbDetails.overview}</p>
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
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full border-2 border-white/25 border-t-white animate-spin" />
              <p className="text-white/50 text-xs font-medium tracking-wide">{displayTitle}</p>
            </div>
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
                Impossible de démarrer la lecture.<br/>Réessayez ou revenez plus tard.
              </p>
              <div className="flex gap-3 w-full">
                <button type="button" onClick={goBack} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white transition-colors text-center"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Retour
                </button>
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

      <AnimatePresence>
        {buffering && !fetchingEpisode && !episodeNotFound && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[18] flex items-center justify-center pointer-events-none"
          >
            <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!playing && !fetchingEpisode && !episodeNotFound && (
          <motion.div
            initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[25] flex flex-col items-center justify-center gap-3 pointer-events-none"
          >
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                togglePlay()
              }}
              className="pointer-events-auto w-20 h-20 rounded-full bg-white/95 flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
              aria-label="Lecture"
            >
              <Play className="w-8 h-8 text-black fill-black ml-1" />
            </button>
            <p className="text-white/55 text-xs font-medium pointer-events-none">Appuie pour lire</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && !fetchingEpisode && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className={`absolute inset-0 z-20 flex flex-col justify-between pointer-events-none ${!showControls ? 'cursor-none' : ''}`}
          >
            <div
              className="pointer-events-auto px-4 md:px-6 pb-20 bg-gradient-to-b from-black/75 via-black/25 to-transparent flex items-center gap-3"
              style={{ paddingTop: 'max(14px, env(safe-area-inset-top, 0px))' }}
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
            >
              <div className="min-w-0 flex-1 pl-14">
                <p className="text-white font-semibold text-sm md:text-base truncate leading-tight">{displayTitle}</p>
                {seriesTag && <p className="text-white/45 text-[11px] font-bold tracking-wider uppercase mt-0.5">{seriesTag}</p>}
              </div>
              {type === 'series' && (
                <button
                  type="button"
                  onClick={() => setShowEpisodes(true)}
                  className="shrink-0 h-10 px-4 rounded-full bg-white text-black text-xs font-black tracking-widest uppercase inline-flex items-center gap-2"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Épisodes</span>
                </button>
              )}
            </div>

            <div
              className="pointer-events-auto px-4 md:px-7 pb-5 md:pb-7 bg-gradient-to-t from-black via-black/70 to-transparent"
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-white/70 text-xs font-mono tabular-nums w-12">{fmt(currentTime)}</span>
                <div
                  ref={progressRef}
                  className="relative flex-1 h-5 cursor-pointer group/bar flex items-center"
                  onClick={seek}
                  onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); seekAt(e.clientX) }}
                  onPointerMove={e => { if (e.buttons) seekAt(e.clientX); onProgressHover(e as any) }}
                  onMouseMove={onProgressHover}
                  onMouseLeave={() => setHoverTime(null)}
                >
                  <div className="relative w-full h-[3px] group-hover/bar:h-[5px] transition-all rounded-full bg-white/20">
                    <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${buffered}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${progress}%` }}>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full opacity-0 group-hover/bar:opacity-100 shadow-md" />
                    </div>
                  </div>
                  {hoverTime !== null && (
                    <div className="absolute -top-8 bg-black/85 text-white text-[11px] font-semibold px-2 py-1 rounded-md pointer-events-none -translate-x-1/2" style={{ left: hoverX }}>
                      {fmt(hoverTime)}
                    </div>
                  )}
                </div>
                <span className="text-white/45 text-xs font-mono tabular-nums w-12 text-right">-{fmt(remaining)}</span>
              </div>

              <div className="flex items-center gap-0.5 min-w-0">
                <button type="button" onClick={() => skip(-10)} className="w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); togglePlay() }}
                  className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center mx-1 hover:scale-105 transition-transform"
                >
                  {playing ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
                </button>
                <button type="button" onClick={() => skip(10)} className="w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center">
                  <SkipForward className="w-5 h-5" />
                </button>

                <div className="hidden sm:flex items-center ml-1" onMouseEnter={() => setShowVol(true)} onMouseLeave={() => setShowVol(false)}>
                  <button type="button" onClick={toggleMute} className="w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center">
                    {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <AnimatePresence>
                    {showVol && (
                      <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 88, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden flex items-center">
                        <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={e => changeVolume(+e.target.value)} className="np-slider w-[80px] cursor-pointer" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1" />

                {type === 'series' && (
                  <>
                    <button type="button" disabled={!prevEp} onClick={() => prevEp && goToEpisode(prevEp)} className="hidden md:flex w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10 items-center justify-center disabled:opacity-25" title="Épisode précédent">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button type="button" disabled={!nextEp} onClick={() => nextEp && goToEpisode(nextEp)} className="hidden md:flex w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10 items-center justify-center disabled:opacity-25" title="Épisode suivant">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => setShowEpisodes(true)} className="w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center">
                      <List className="w-5 h-5" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    // @ts-ignore
                    if (videoRef.current?.webkitShowPlaybackTargetPicker) videoRef.current.webkitShowPlaybackTargetPicker()
                  }}
                  className="hidden sm:flex w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 items-center justify-center"
                >
                  <Cast className="w-5 h-5" />
                </button>

                {tmdbId && (
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={e => {
                      e.stopPropagation()
                      if (isDownloading) return
                      if (!userId) { setShowLoginPrompt(true); return }
                      triggerDownload()
                    }}
                    className="w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center disabled:opacity-50"
                    title="Télécharger"
                  >
                    {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  </button>
                )}

                <div ref={settingsRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSettings(s => !s)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${showSettings ? 'bg-white text-black' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
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
                        className="absolute bottom-full right-0 mb-2 shadow-2xl overflow-hidden min-w-[270px] rounded-2xl border border-white/10"
                        style={{ background: 'rgba(12,12,14,0.96)', backdropFilter: 'blur(20px)' }}
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
                                <span className="absolute bottom-0 left-0 right-0" style={{ height: '2px', background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.7)' }} />
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
                                    background: active ? '#ef4444' : 'rgba(255,255,255,0.28)',
                                  }} />
                                  <span style={{
                                    fontSize: '13px',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? '#ef4444' : 'rgba(255,255,255,0.82)',
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
                                    background: active ? '#ef4444' : 'rgba(255,255,255,0.28)',
                                  }} />
                                  <span style={{
                                    fontSize: '13px',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? '#ef4444' : 'rgba(255,255,255,0.82)',
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
                                <span style={{ fontSize: '12px', fontWeight: 700, color: audioBoost > 100 ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>
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
                                  style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}
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
                                <span style={{ fontSize: '12px', fontWeight: 700, color: brightness !== 100 ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>
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
                                <span style={{ fontSize: '12px', fontWeight: 700, color: contrast !== 100 ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>
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

                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); toggleFs() }}
                  className="w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center"
                >
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
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative mx-4 rounded-3xl p-8 flex flex-col items-center text-center max-w-sm w-full overflow-hidden bg-white/[0.04] border border-white/10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Lueur douce derrière l'icône */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-primary/20 blur-[50px] pointer-events-none" />

              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-primary/10 border border-primary/25">
                <Lock className="w-6 h-6 text-primary" />
              </div>

              <h3 className="relative text-white font-bold text-xl mb-2 tracking-tight">Connexion requise</h3>
              <p className="relative text-white/45 text-sm leading-relaxed mb-7">
                Connecte-toi pour télécharger ce contenu et accéder à ton espace StreamSelf.
              </p>

              <div className="relative flex gap-3 w-full">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors text-center border border-white/10"
                >
                  Annuler
                </button>
                <button
                  onClick={goToLoginForDownload}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
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
