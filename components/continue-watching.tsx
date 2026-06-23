'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowUpRight, Play, Film, Tv } from 'lucide-react'
import { useSession } from '@/components/session-provider'
import { useDrawer } from '@/components/movie-drawer'

interface WatchItem {
  id: string
  content_id: number
  content_type: 'movie' | 'series'
  title: string
  poster_url: string | null
  progress: number
  season?: number
  episode?: number
  finished: boolean
  watched_at: string
}

export function ContinueWatching() {
  const { user } = useSession()
  const { openDrawer } = useDrawer()
  const [items, setItems] = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [logos, setLogos] = useState<Record<number, string | null>>({})

  const fetchHistory = () => {
    if (!user) { setLoading(false); return }
    // Utiliser le profile_id depuis le cookie si disponible
    const profileId = document.cookie.split('; ').find(r => r.startsWith('active_profile_id='))?.split('=')[1] || null
    const param = profileId ? `profile_id=${profileId}` : `user_id=${user.id}`
    fetch(`/api/watch-history?${param}&limit=10`)
      .then(r => r.json())
      .then(data => {
        const unfinished = (Array.isArray(data) ? data : []).filter((i: WatchItem) => !i.finished && i.progress > 0)
        setItems(unfinished)
        Promise.all(unfinished.map(async (item: WatchItem) => {
          try {
            const apiType = item.content_type === 'movie' ? 'movie' : 'series'
            const r = await fetch(`/api/content/${apiType}/${item.content_id}`, { cache: 'force-cache' })
            if (!r.ok) return { id: item.content_id, logo: null, poster: null }
            const d = await r.json()
            const poster = d.details?.poster_path
              ? `https://image.tmdb.org/t/p/w500${d.details.poster_path}`
              : null
            return { id: item.content_id, logo: d.logo ?? null, poster }
          } catch { return { id: item.content_id, logo: null, poster: null } }
        })).then(results => {
          const logoMap: Record<number, string | null> = {}

          const posterMap: Record<number, string | null> = {}
          results.forEach(({ id, logo, poster }: { id: number; logo: string | null; poster: string | null }) => {
            logoMap[id] = logo
            posterMap[id] = poster
          })
          setLogos(logoMap)
          setItems(prev => prev.map(item => ({
            ...item,
            poster_url: item.poster_url || posterMap[item.content_id] || null
          })))
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchHistory()
  }, [user])

  // Rafraîchir quand la page redevient visible (retour du player)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchHistory() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user])

  if (!user || loading || items.length === 0) return null

  return (
    <section className="relative py-6">
      <div className="mb-4 px-4 flex items-center justify-between" style={{ paddingLeft: '1rem' }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-2"
        >
          <div
            className="w-[3px] rounded-sm"
            style={{
              background: '#e53935',
              height: '1rem',
            }}
          />
          <h2 className="text-base md:text-lg font-bold text-white tracking-wide">
            Continuer à regarder
          </h2>
        </motion.div>
      </div>

      <div
        className="flex gap-4 overflow-x-auto hide-scrollbar pb-4"
        style={{ paddingLeft: '1rem', paddingRight: '1rem' }}
      >
        {items.map((item, i) => {
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex-shrink-0 w-44 md:w-56 group"
            >
              <button
                onClick={() => openDrawer(item.content_type, item.content_id)}
                className="w-full text-left appearance-none bg-transparent outline-none cursor-pointer"
              >
                <div className="relative bg-zinc-800 aspect-[2/3]"
                  style={{
                    borderRadius: '0.75rem',
                    transform: 'scale(1)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  }}>
                  <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '0.75rem' }}>
                  {item.poster_url ? (
                    <Image
                      src={item.poster_url}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 160px, 192px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.content_type === 'movie'
                        ? <Film className="w-8 h-8 text-zinc-600" />
                        : <Tv className="w-8 h-8 text-zinc-600" />}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl">
                      <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  {item.content_type === 'series' && item.season && item.episode && (
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                      S{String(item.season).padStart(2,'0')} E{String(item.episode).padStart(2,'0')}
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                    {item.progress}%
                  </div>
                  </div>
                </div>

                <div className="mt-2 px-1">
                    <p className="text-white/90 text-sm font-semibold truncate">{item.title}</p>
                </div>
              </button>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
