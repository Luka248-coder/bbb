'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContentCard } from '@/components/content-card'
import { Top10Row } from '@/components/top10-row'
import type { Movie, Series } from '@/lib/content-types'

interface ContentRowProps {
  title: string
  content: (Movie | Series)[]
  type: 'movie' | 'series'
  showRank?: boolean
  accentColor?: string
  viewAllHref?: string
}

const ROW_CONFIG: Record<string, { color: string; href: string }> = {
  'Nouveautés Films':            { color: '#1d6fe8', href: '/movies?sort=new' },
  'Nouveautés Séries':           { color: '#1d6fe8', href: '/series?sort=new' },
  'Top 10 Films de la semaine':  { color: '#1d6fe8', href: '/movies?sort=top' },
  'Top 10 Séries de la semaine': { color: '#1d6fe8', href: '/series?sort=top' },
  'Films populaires':            { color: '#1d6fe8', href: '/movies?sort=popular' },
  'Séries populaires':           { color: '#1d6fe8', href: '/series?sort=popular' },
}

export function ContentRow({ title, content, type, showRank = false, accentColor, viewAllHref }: ContentRowProps) {
  // Déléguer les Top 10 au composant dédié
  if (title === 'Top 10 Films de la semaine' || title === 'Top 10 Séries de la semaine') {
    return <Top10Row title={title} content={content} type={type} accentColor={accentColor ?? '#1d6fe8'} />
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const [logos, setLogos] = useState<Record<number, string | null>>({})

  const config = ROW_CONFIG[title]
  const color = accentColor ?? config?.color ?? '#1d6fe8'
  const href = viewAllHref ?? config?.href ?? (type === 'movie' ? '/movies' : '/series')

  // Fetch logos pour les items visibles (les 10 premiers)
  useEffect(() => {
    const visible = content.slice(0, 10)
    const mediaType = type === 'movie' ? 'movie' : 'series'

    Promise.all(
      visible.map(async (item) => {
        const tmdbId = (item as any).tmdb_id || item.id
        try {
          const res = await fetch(
            `/api/content/${mediaType}/${tmdbId}`,
            { cache: 'force-cache' }
          )
          if (!res.ok) return { id: item.id, logo: null }
          const data = await res.json()
          return { id: item.id, logo: data.logo ?? null }
        } catch {
          return { id: item.id, logo: null }
        }
      })
    ).then((results) => {
      const map: Record<number, string | null> = {}
      results.forEach(({ id, logo }) => { map[id] = logo })
      setLogos(map)
    })
  }, [content, type])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = scrollRef.current.clientWidth * 0.8
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  if (content.length === 0) return null

  return (
    <section className="relative py-6">
      <div className="px-4 mb-4 flex items-center justify-between" style={{ paddingLeft: '1rem' }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-2"
        >
          <div
            className="w-[3px] rounded-sm"
            style={{
              background: color,
              height: '1rem',
            }}
          />
          <h2 className="text-base md:text-lg font-bold text-white tracking-wide">
            {title}
          </h2>
        </motion.div>

        <Link href={href}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-center w-8 h-8 border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition-all rounded-full cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
          </motion.div>
        </Link>
      </div>

      <div className="relative group">
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto hide-scrollbar pb-4"
          style={{ overflowY: 'visible' }}
          style={{ paddingLeft: "1rem", paddingRight: "1rem" }}
        >
          {content.map((item, index) => (
            <ContentCard
              key={`${type}-${item.id}-${index}`}
              content={item}
              type={type}
              index={index}
              showRank={showRank}
              logoUrl={logos[item.id]}
            />
          ))}
        </div>

        <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </section>
  )
}
