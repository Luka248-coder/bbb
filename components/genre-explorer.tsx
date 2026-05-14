'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Film, Smile, Zap, Target, Mountain, Fingerprint, Rocket, Skull, Users, Palette } from 'lucide-react'
import { useEffect, useState } from 'react'
import { type Movie, type Series } from '@/lib/content-types'

const featuredGenres = [
  { id: 18,    name: 'Drame',          icon: Film,        glow: '#3b82f6', bg: 'from-blue-900/80 via-blue-950/60 to-black/80' },
  { id: 35,    name: 'Comédie',        icon: Smile,       glow: '#eab308', bg: 'from-yellow-900/80 via-yellow-950/60 to-black/80' },
  { id: 28,    name: 'Action',         icon: Zap,         glow: '#ef4444', bg: 'from-red-900/80 via-red-950/60 to-black/80' },
  { id: 53,    name: 'Thriller',       icon: Target,      glow: '#6b7280', bg: 'from-zinc-800/80 via-zinc-900/60 to-black/80' },
  { id: 12,    name: 'Aventure',       icon: Mountain,    glow: '#22c55e', bg: 'from-green-900/80 via-green-950/60 to-black/80' },
  { id: 80,    name: 'Crime',          icon: Fingerprint, glow: '#a855f7', bg: 'from-purple-900/80 via-purple-950/60 to-black/80' },
  { id: 878,   name: 'Science-Fiction',icon: Rocket,      glow: '#06b6d4', bg: 'from-cyan-900/80 via-cyan-950/60 to-black/80' },
  { id: 27,    name: 'Horreur',        icon: Skull,       glow: '#374151', bg: 'from-zinc-900/90 via-black/80 to-black/90' },
  { id: 10751, name: 'Familial',       icon: Users,       glow: '#10b981', bg: 'from-emerald-900/80 via-emerald-950/60 to-black/80' },
  { id: 16,    name: 'Animation',      icon: Palette,     glow: '#ec4899', bg: 'from-pink-900/80 via-pink-950/60 to-black/80' },
]

// Composant card individuel avec backdrop d'un film du genre
function GenreCard({ genre, movies, series, index }: { 
  genre: typeof featuredGenres[0]
  movies: any[]
  series: any[]
  index: number 
}) {
  const Icon = genre.icon
  const totalCount = movies.length + series.length

  // Prend un backdrop aléatoire parmi les films du genre
  const allItems = [...movies, ...series].filter(i => i.backdrop_path)
  const backdropItem = allItems[Math.floor(Math.random() * Math.min(allItems.length, 5))]
  const backdropUrl = backdropItem?.backdrop_path 
    ? `https://image.tmdb.org/t/p/w780${backdropItem.backdrop_path}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className="relative"
    >
      <Link href={`/genre/${genre.id}`}>
        <div
          className="relative overflow-hidden rounded-2xl cursor-pointer group"
          style={{
            height: '120px',
            boxShadow: `0 8px 32px ${genre.glow}22`,
          }}
        >
          {/* Backdrop image */}
          {backdropUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: `url(${backdropUrl})` }}
            />
          )}

          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${genre.bg}`} />

          {/* Glow effect on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-2xl"
            style={{ background: `radial-gradient(circle at 30% 70%, ${genre.glow}, transparent 60%)` }}
          />

          {/* Border glow */}
          <div
            className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-white/20 transition-colors"
            style={{ boxShadow: `inset 0 0 0 1px ${genre.glow}33` }}
          />

          {/* Content */}
          <div className="relative h-full flex items-end p-4">
            <div className="flex items-end justify-between w-full">
              <div>
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                  style={{ 
                    background: `${genre.glow}33`,
                    border: `1px solid ${genre.glow}55`,
                    boxShadow: `0 0 12px ${genre.glow}44`
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: genre.glow }} />
                </div>

                {/* Genre name */}
                <p
                  className="text-white font-black text-base leading-tight"
                  style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
                >
                  {genre.name}
                </p>

                {/* Count */}
                <p
                  className="text-white/50 text-xs font-semibold uppercase tracking-widest mt-0.5"
                  style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
                >
                  {totalCount} titre{totalCount > 1 ? 's' : ''}
                </p>
              </div>

              {/* Arrow */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

interface GenreExplorerProps {
  movies: any[]
  series: any[]
}

export function GenreExplorer({ movies, series }: GenreExplorerProps) {
  return (
    <section className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white mb-1"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
          Explorer par genre
        </h2>
        <p className="text-white/30 text-sm">Accès direct aux catégories les plus populaires du catalogue.</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {featuredGenres.map((genre, index) => {
          const genreMovies = movies.filter(m => m.genre_ids?.includes(genre.id))
          const genreSeries = series.filter(s => s.genre_ids?.includes(genre.id))
          return (
            <GenreCard
              key={genre.id}
              genre={genre}
              movies={genreMovies}
              series={genreSeries}
              index={index}
            />
          )
        })}
      </div>
    </section>
  )
}