'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Film, Tv, Star, Check, X, Send, Sparkles, ArrowLeft, Play } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useDrawer } from '@/components/movie-drawer'

interface TMDBResult {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  overview: string
}

interface RequestFormProps {
  userId: string
}

export function RequestForm({ userId }: RequestFormProps) {
  const { openDrawer } = useDrawer()
  const [tab, setTab] = useState<'movie' | 'series'>('movie')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<TMDBResult | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [alreadyAvailable, setAlreadyAvailable] = useState(false)
  const [availableTmdbId, setAvailableTmdbId] = useState<number | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const type = tab === 'movie' ? 'movie' : 'tv'
        const res = await fetch(`/api/auth/admin/tmdb-search?q=${encodeURIComponent(query)}&type=${type}`)
        const data = await res.json()
        setResults(data.results?.slice(0, 6) || [])
      } catch {}
      setSearching(false)
    }, 400)
  }, [query, tab])

  // Check if already in catalog
  useEffect(() => {
    if (!selected) return
    const check = async () => {
      const table = tab === 'movie' ? 'movies' : 'series'
      const res = await fetch(`/api/content/${tab}/${selected.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.details) {
          // Check in our DB
          const dbRes = await fetch(`/api/catalog-check?tmdb_id=${selected.id}&type=${tab}`)
          if (dbRes.ok) {
            const dbData = await dbRes.json()
            setAlreadyAvailable(dbData.available)
          }
        }
      }
    }
    check().catch(() => {})
  }, [selected, tab])

  const handleSelect = (result: TMDBResult) => {
    setSelected(result)
    setResults([])
    setAlreadyAvailable(false)
  }

  const handleSend = async () => {
    if (!selected) return
    setSending(true)
    try {
      const title = selected.title || selected.name || ''
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title,
          content_type: tab,
          description: message || selected.overview?.slice(0, 200) || '',
          tmdb_id: selected.id,
          poster: selected.poster_path,
        }),
      })
      if (res.ok) setSent(true)
    } catch (e) { console.error(e) }
    setSending(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Demande envoyée !</h2>
          <p className="text-white/50 mb-8">Vous serez notifié quand votre demande sera traitée.</p>
          <button onClick={() => { setSent(false); setSelected(null); setQuery(''); setMessage('') }}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-semibold transition-all">
            Faire une autre demande
          </button>
        </motion.div>
      </div>
    )
  }

  const selectedTitle = selected?.title || selected?.name || ''
  const selectedYear = selected?.release_date || selected?.first_air_date ? new Date((selected.release_date || selected.first_air_date)!).getFullYear() : ''

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 text-primary px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Demande de contenu
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-4">
          Proposer un<br />
          <span className="text-primary">titre</span>
        </h1>
        <p className="text-white/40 text-lg leading-relaxed">
          Un film ou une série manque au catalogue ?<br />
          Recherchez-le et soumettez votre demande.
        </p>
      </motion.div>

      <div className="space-y-8">
        {/* Step 1 — Type */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">1 · Type de contenu</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'movie', label: 'Film', sub: 'Long métrage', icon: Film },
              { value: 'series', label: 'Série', sub: 'TV / Animé', icon: Tv },
            ].map(opt => {
              const Icon = opt.icon
              const isActive = tab === opt.value
              return (
                <button key={opt.value} onClick={() => { setTab(opt.value as any); setSelected(null); setQuery(''); setResults([]) }}
                  className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    isActive
                      ? 'bg-primary/10 border-primary text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                  }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isActive ? 'bg-primary/20' : 'bg-white/10'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-white/40'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{opt.label}</p>
                    <p className={`text-xs ${isActive ? 'text-white/50' : 'text-white/30'}`}>{opt.sub}</p>
                  </div>
                  {isActive && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Step 2 — Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">2 · Rechercher le titre</p>
          <div className="relative">
            <div className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 focus-within:border-white/30 transition-colors">
              {searching ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin flex-shrink-0" />
              ) : (
                <Search className="w-5 h-5 text-white/30 flex-shrink-0" />
              )}
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                placeholder={`Rechercher un ${tab === 'movie' ? 'film' : 'une série'}...`}
                className="flex-1 bg-transparent text-white outline-none placeholder-white/20 text-sm"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); setSelected(null) }}>
                  <X className="w-5 h-5 text-white/30 hover:text-white/60 transition-colors" />
                </button>
              )}
            </div>

            {/* Dropdown results */}
            <AnimatePresence>
              {results.length > 0 && !selected && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden z-10 shadow-2xl">
                  {results.map(result => {
                    const title = result.title || result.name || ''
                    const year = result.release_date || result.first_air_date ? new Date((result.release_date || result.first_air_date)!).getFullYear() : ''
                    return (
                      <button key={result.id} onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left">
                        <div className="relative w-9 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                          {result.poster_path && <Image src={`https://image.tmdb.org/t/p/w92${result.poster_path}`} alt={title} fill className="object-cover" sizes="36px" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {year && <span className="text-white/40 text-xs">{year}</span>}
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-white/40 text-xs">{result.vote_average?.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Step 3 — Selected */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">3 · Titre sélectionné</p>
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                {/* Backdrop */}
                {selected.backdrop_path && (
                  <div className="relative h-44">
                    <Image src={`https://image.tmdb.org/t/p/w780${selected.backdrop_path}`} alt={selectedTitle} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
                  </div>
                )}

                {/* Info */}
                <div className={`flex gap-4 p-4 ${selected.backdrop_path ? '-mt-20 relative' : ''}`}>
                  <div className="relative w-20 h-28 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 shadow-xl">
                    {selected.poster_path && <Image src={`https://image.tmdb.org/t/p/w185${selected.poster_path}`} alt={selectedTitle} fill className="object-cover" sizes="80px" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-2">
                    <h3 className="text-white font-black text-xl truncate">{selectedTitle}</h3>
                    <div className="flex items-center gap-2 mt-1 mb-2">
                      {selectedYear && <span className="text-white/50 text-sm">{selectedYear}</span>}
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-yellow-400 font-bold text-sm">{selected.vote_average?.toFixed(1)}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-primary/80 text-white text-xs font-bold rounded uppercase">
                        {tab === 'movie' ? 'Film' : 'Série'}
                      </span>
                    </div>
                    {selected.overview && (
                      <p className="text-white/40 text-xs line-clamp-2">{selected.overview}</p>
                    )}
                    <button onClick={() => { setSelected(null); setAlreadyAvailable(false) }}
                      className="flex items-center gap-1 text-white/30 hover:text-white/60 text-xs mt-2 transition-colors">
                      <ArrowLeft className="w-3 h-3" /> Changer de sélection
                    </button>
                  </div>
                </div>

                {/* Already available */}
                {alreadyAvailable && (
                  <div className="mx-4 mb-4 flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-green-400 font-semibold text-sm">Déjà disponible sur StreamSelf !</p>
                      <p className="text-green-400/60 text-xs">Pas besoin de faire de demande.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 4 — Message */}
        <AnimatePresence>
          {selected && !alreadyAvailable && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">
                4 · Message <span className="text-white/20">(optionnel)</span>
              </p>
              <div className="relative">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, 500))}
                  placeholder="Ajoutez un commentaire pour l'équipe..."
                  rows={4}
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 transition-colors resize-none"
                />
                <span className="absolute bottom-3 right-4 text-white/20 text-xs">{message.length}/500</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {alreadyAvailable ? (
                <button
                  onClick={() => openDrawer(tab as 'movie' | 'series', selected.id)}
                  className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl text-base transition-all shadow-lg shadow-green-500/20"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Regarder maintenant →
                </button>
              ) : (
                <button onClick={handleSend} disabled={sending}
                  className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-all shadow-lg shadow-primary/20">
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {sending ? 'Envoi...' : 'Envoyer la demande'}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!selected && !query && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="flex items-center justify-center gap-3 bg-zinc-900 border border-white/5 rounded-2xl py-5 text-white/20">
              <Search className="w-5 h-5" />
              <span className="font-semibold text-sm">Recherchez et sélectionnez un titre</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}