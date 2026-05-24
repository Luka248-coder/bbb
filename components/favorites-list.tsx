'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Play, Trash2, Film, Tv, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPosterUrl } from '@/lib/content-types'
import type { Favorite } from '@/lib/types'

interface FavoritesListProps {
  userId: string
}

export function FavoritesList({ userId }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFavorites()
  }, [userId])

  const fetchFavorites = async () => {
    try {
      const res = await fetch(`/api/favorites?user_id=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setFavorites(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (tmdbId: number, contentType: string) => {
    try {
      const res = await fetch(
        `/api/favorites?tmdb_id=${tmdbId}&content_type=${contentType}&user_id=${userId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setFavorites(prev =>
          prev.filter(f => !(f.tmdb_id === tmdbId && f.content_type === contentType))
        )
      }
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  const movies = favorites.filter(f => f.content_type === 'movie')
  const series = favorites.filter(f => f.content_type === 'series')

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Accueil</Link>
            <span>&gt;</span>
            <span className="text-zinc-400">Mes Favoris</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[3px] rounded-full self-stretch flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #e53935, transparent)', minHeight: '3.5rem' }} />
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-none tracking-tight">Mes Favoris</h1>
              {!loading && (
                <p className="text-zinc-500 text-base font-medium mt-1">{favorites.length} titre{favorites.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[2/3] rounded-xl shimmer" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-12">
            {movies.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Film className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Films ({movies.length})</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  <AnimatePresence>
                    {movies.map(favorite => (
                      <FavoriteCard key={favorite.id} favorite={favorite} onRemove={removeFavorite} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
            {series.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Tv className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Séries ({series.length})</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  <AnimatePresence>
                    {series.map(favorite => (
                      <FavoriteCard key={favorite.id} favorite={favorite} onRemove={removeFavorite} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative flex flex-col items-center justify-center py-28 px-4 overflow-hidden"
    >
      {/* Glow background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #e50914 0%, transparent 70%)' }}
        />
      </div>

      {/* Icône animée */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
        className="relative mb-8"
      >
        {/* Anneaux pulsants */}
        {[1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-primary/20"
            style={{ margin: `-${i * 18}px` }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
          />
        ))}
        {/* Cercle central */}
        <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <Heart className="w-10 h-10 text-zinc-600" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Texte */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-center relative z-10"
      >
        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">
          Votre liste est vide
        </h3>
        <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed mb-8">
          Ajoutez des films et séries à vos favoris pour les retrouver ici en un clic.
        </p>

        {/* CTA */}
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-sm text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #e50914 0%, #b20710 100%)',
              boxShadow: '0 0 30px rgba(229,9,20,0.35)',
            }}
          >
            <Sparkles className="w-4 h-4" />
            Parcourir le catalogue
          </motion.button>
        </Link>
      </motion.div>
    </motion.div>
  )
}

function FavoriteCard({ favorite, onRemove }: { favorite: Favorite; onRemove: (tmdbId: number, contentType: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative"
    >
      <Link href={`/watch/${favorite.content_type}/${favorite.tmdb_id}`}>
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card">
          <Image
            src={getPosterUrl(favorite.poster)}
            alt={favorite.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, 16vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-colors">
              <Play className="w-3.5 h-3.5 fill-current" /> Regarder
            </button>
          </div>
        </div>
      </Link>
      <button
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80"
        onClick={() => onRemove(favorite.tmdb_id, favorite.content_type)}
      >
        <Trash2 className="w-3.5 h-3.5 text-white" />
      </button>
      <h3 className="mt-2.5 font-semibold text-sm truncate text-foreground">{favorite.title}</h3>
    </motion.div>
  )
}
