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
  // ... (je garde ton EpisodesPanel tel quel - pas de changement ici)
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
      {/* Ton code EpisodesPanel existant... */}
      {/* Je ne le recopie pas entièrement pour gagner de la place, mais il reste identique */}
      {/* ... (le reste de ton EpisodesPanel) */}
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
  const settingsRef = useRef<HTMLDivElement>(null)

  const [videoUrl, setVideoUrl] = useState(initialVideoUrl)
  const [title, setTitle] = useState(initialTitle)
  const [currentSeason, setCurrentSeason] = useState(initialSeason)
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode)
  const [displayTitle, setDisplayTitle] = useState(initialTitle)
  const [showEpisodes, setShowEpisodes] = useState(false)

  // ... (tous tes autres states restent identiques)
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

  // Refs pour watch progress
  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const currentSeasonRef = useRef(initialSeason)
  const currentEpisodeRef = useRef(initialEpisode)
  const titleRef = useRef(initialTitle)

  // ... (tout le reste de tes useEffects et fonctions reste identique sauf le fallback Purstream)

  // ─── Fallback Purstream Corrigé ─────────────────────────────────────────────
  useEffect(() => {
    if (videoUrl || !tmdbId) return
    setPurstreamLoading(true)

    const PURSTREAM = 'https://api.purstream.ac/api/v1'
    const contentTitle = seriesName || title

    async function fetchFromPurstream() {
      try {
        console.log(`[Client Purstream] Recherche: "${contentTitle}" (TMDB: ${tmdbId})`)

        const searchRes = await fetch(
          `${PURSTREAM}/search-bar/search/${encodeURIComponent(contentTitle)}`,
          { headers: { Accept: 'application/json' } }
        )

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
            const typeOk = isMovie
              ? ['movie', 'film'].includes(rType)
              : ['series', 'tv', 'show', 'série', 'serie'].includes(rType)
            return typeOk && (
              rTitle === norm || rTitle.includes(norm) || norm.includes(rTitle)
            )
          })
        }
        if (!match) match = results[0]
        if (!match?.id) return

        const sheetRes = await fetch(`${PURSTREAM}/media/${match.id}/sheet`, {
          headers: { Accept: 'application/json' }
        })
        if (!sheetRes.ok) return

        const sheet = await sheetRes.json()

        let url: string | null = null
        if (isMovie) {
          if (sheet.sources?.length) {
            const mp4 = sheet.sources.find((s: any) => s.url?.includes('.mp4'))
            const m3u8 = sheet.sources.find((s: any) => s.url?.includes('.m3u8'))
            url = mp4?.url || m3u8?.url || sheet.sources[0]?.url
          }
          url = url || sheet.stream_url || sheet.video_url || sheet.url
        } else {
          const ep = sheet.episodes?.find((e: any) => e.season === currentSeason && e.episode === currentEpisode)
          if (ep?.sources?.length) {
            const mp4 = ep.sources.find((s: any) => s.url?.includes('.mp4'))
            const m3u8 = ep.sources.find((s: any) => s.url?.includes('.m3u8'))
            url = mp4?.url || m3u8?.url || ep.sources[0]?.url
          }
          url = url || ep?.video_url || null
        }

        if (url) {
          console.log('[Client Purstream] ✅ Vidéo trouvée')
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

  // ... Le reste de ton code (loadVideo, controls, etc.) reste inchangé ...

  // À la fin du fichier :
  if (!videoUrl && purstreamLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-zinc-400 animate-spin" />
      </div>
    )
  }

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center">
        <h2 className="text-white text-2xl mb-4">Contenu non disponible</h2>
        <p className="text-zinc-500 mb-6">Ce contenu n'est pas encore disponible.</p>
        <Link href={backUrl}>
          <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white">
            ← Retour
          </button>
        </Link>
      </div>
    )
  }

  // ... Le reste de ton return (video + controls) reste identique ...
}

// Export final
export { NativePlayer }
