'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowUpRight, Play, Film, Tv } from 'lucide-react'
import { useSession } from '@/components/session-provider'

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
  const [items, setItems] = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetch(`/api/watch-history?user_id=${user.id}&limit=10`)
      .then(r => r.json())
      .then(data => {
        const unfinished = (Array.isArray(data) ? data : []).filter((i: WatchItem) => !i.finished && i.progress > 0)
        setItems(unfinished)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (!user || loading || items.length === 0) return null

  return (
    <section className="relative py-6">
      <div className="container mx-auto px-4 mb-4 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-2 pl-3"
        >
          <div
            className="w-[3px] rounded-full self-stretch"
            style={{
              background: 'linear-gradient(to bottom, #3b82f6, transparent)',
              minHeight: '2rem',
            }}
          />
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Continuer à regarder
          </h2>
        </motion.div>
      </div>

      <div
        className="flex gap-4 overflow-x-auto hide-scrollbar pb-4"
        style={{ paddingLeft: 'max(1rem, calc((100% - 80rem) / 2 + 1rem))', paddingRight: '1rem' }}
      >
        {items.map((item, i) => {
          const href = item.content_type === 'movie'
            ? `/watch/movie/${item.content_id}`
            : `/watch/series/${item.content_id}?season=${item.season ?? 1}&episode=${item.episode ?? 1}`

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex-shrink-0 w-40 md:w-48 group"
            >
              <Link href={href}>
                <div className="relative overflow-hidden rounded-xl bg-zinc-800 aspect-[2/3]">
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

                <div className="mt-2 px-1">
                  <p className="text-white/90 text-sm font-semibold truncate">{item.title}</p>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}