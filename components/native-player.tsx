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
  seriesName?: string | null
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
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Season selector + Episodes list (ton code original) */}
      {/* ... (je garde ton EpisodesPanel complet, mais pour raccourcir ici, assume qu'il est identique) */}
      {/* Tu peux garder ton EpisodesPanel original tel quel */}
    </motion.div>
  )
}

// ─── Main Player ───────────────────────────────────────────────────────────────
function NativePlayer({
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
  seriesName = null,
}: NativePlayerProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [videoUrl, setVideoUrl] = useState(initialVideoUrl)
  const [title, setTitle] = useState(initialTitle)
  const [currentSeason, setCurrentSeason] = useState(initialSeason)
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode)
  const [displayTitle, setDisplayTitle] = useState(initialTitle)
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
  const [purstreamLoading, setPurstreamLoading] = useState(!initialVideoUrl && !!tmdbId)

  // Fallback Purstream Client Corrigé
  useEffect(() => {
    if (videoUrl || !tmdbId) return
    setPurstreamLoading(true)

    const PURSTREAM = 'https://api.purstream.ac/api/v1'
    const contentTitle = seriesName || title

    async function fetchFromPurstream() {
      try {
        console.log(`[Client Purstream] Recherche: "${contentTitle}" (TMDB: ${tmdbId})`)

        const searchRes = await fetch(`${PURSTREAM}/search-bar/search/${encodeURIComponent(contentTitle)}`)
        if (!searchRes.ok) return

        const responseData = await searchRes.json()

        let results: any[] = []
        if (responseData?.data?.items?.movies?.items) results = responseData.data.items.movies.items
        else if (responseData?.data?.items?.series?.items) results = responseData.data.items.series.items
        else if (responseData?.data?.items) results = Array.isArray(responseData.data.items) ? responseData.data.items : []
        else if (Array.isArray(responseData)) results = responseData

        if (results.length === 0) return

        const isMovie = type === 'movie'
        let match = results.find(r => String(r.tmdb_id) === String(tmdbId))
        if (!match) {
          const norm = contentTitle.toLowerCase().trim().replace(/[:]/g, '')
          match = results.find(r => {
            const rTitle = (r.title || r.name || '').toLowerCase().trim()
            const rType = (r.type || r.media_type || '').toLowerCase()
            const typeOk = isMovie ? ['movie', 'film'].includes(rType) : ['series', 'tv', 'show', 'série', 'serie'].includes(rType)
            return typeOk && (rTitle === norm || rTitle.includes(norm) || norm.includes(rTitle))
          })
        }
        if (!match) match = results[0]
        if (!match?.id) return

        const sheetRes = await fetch(`${PURSTREAM}/media/${match.id}/sheet`)
        if (!sheetRes.ok) return

        const sheet = await sheetRes.json()

        // Structure réelle: { data: { items: { urls: [{url, name}], seasons: [...] } } }
        const items = sheet?.data?.items ?? sheet
        let url: string | null = null

        if (isMovie) {
          url = items.urls?.[0]?.url || items.video_url || items.url || null
        } else {
          // Cherche dans seasons[].episodes[]
          const sNum = currentSeason || 1
          const eNum = currentEpisode || 1
          if (items.seasons?.length) {
            const s = items.seasons.find((s: any) => s.number === sNum || s.season === sNum)
            const ep = s?.episodes?.find((e: any) => e.number === eNum || e.episode === eNum)
            url = ep?.urls?.[0]?.url || ep?.url || null
          }
          // Fallback: episodes plat
          if (!url && items.episodes?.length) {
            const ep = items.episodes.find((e: any) =>
              (e.season === sNum || e.seasonNumber === sNum) &&
              (e.episode === eNum || e.number === eNum)
            )
            url = ep?.urls?.[0]?.url || ep?.url || null
          }
          if (!url) url = items.urls?.[0]?.url || null
        }

        if (url) {
          console.log(`[Client Purstream] ✅ URL trouvée !`)
          setVideoUrl(url)
        }
      } catch (err) {
        console.error('[Client Purstream]', err)
      } finally {
        setPurstreamLoading(false)
      }
    }

    fetchFromPurstream()
  }, [tmdbId, type, title, seriesName, currentSeason, currentEpisode, videoUrl])

  // ... Le reste de ton code (video loading, controls, etc.) reste identique ...

  if (!videoUrl && purstreamLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
        <p className="text-white/60 mt-4">Recherche de source vidéo...</p>
      </div>
    )
  }

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center text-center px-6">
        <Film className="w-16 h-16 text-zinc-600 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-3">Contenu non disponible</h2>
        <p className="text-zinc-500 mb-8 max-w-md">Ce contenu n'est pas encore disponible sur nos sources.</p>
        <Link href={backUrl}>
          <button className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white font-medium">
            ← Retour
          </button>
        </Link>
      </div>
    )
  }

  // ... Ton return principal (vidéo + contrôles) reste identique ...

  return (
    <div ref={containerRef} className="w-screen bg-black relative overflow-hidden" style={{ height: '100dvh' }}>
      <video ref={videoRef} className="w-full h-full object-contain" playsInline />

      {/* Tes overlays, contrôles, etc. */}
      {/* ... (le reste de ton UI player) ... */}

    </div>
  )
}

export { NativePlayer }
