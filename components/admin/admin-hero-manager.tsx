'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, X, Film, Tv, Plus, Trash2, GripVertical, Zap, Hand } from 'lucide-react'

const TMDB_KEY = '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'

interface HeroItem {
  id: string
  tmdb_id: number
  type: 'movie' | 'series'
  title: string
  poster_path: string | null
  backdrop_path: string | null
  position: number
}

export function AdminHeroManager() {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [items, setItems] = useState<HeroItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'movie' | 'tv'>('movie')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout>()

  const fetchSettings = async () => {
    setLoading(true)
    const res = await fetch('/api/auth/admin/hero-settings')
    const data = await res.json()
    setMode(data.mode)
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => { fetchSettings() }, [])

  const toggleMode = async () => {
    const next = mode === 'auto' ? 'manual' : 'auto'
    setSaving(true)
    await fetch('/api/auth/admin/hero-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: next }),
    })
    setMode(next)
    setSaving(false)
  }

  const doSearch = useCallback(async (q: string, type: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`${TMDB}/search/${type}?api_key=${TMDB_KEY}&language=fr-FR&query=${encodeURIComponent(q)}&page=1`)
      const data = await res.json()
      setSearchResults((data.results || []).slice(0, 8))
    } catch {}
    setSearching(false)
  }, [])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(searchQuery, searchType), 400)
  }, [searchQuery, searchType, doSearch])

  const addItem = async (result: any) => {
    if (items.length >= 5) return
    setAddingId(result.id)
    await fetch('/api/auth/admin/hero-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: result.id, type: searchType === 'movie' ? 'movie' : 'series' }),
    })
    await fetchSettings()
    setAddingId(null)
  }

  const removeItem = async (id: string) => {
    await fetch(`/api/auth/admin/hero-settings?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
    </div>
  )

  const alreadyAdded = new Set(items.map(i => i.tmdb_id))

  return (
    <div className="space-y-6">

      {/* Mode toggle */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div>
          <p className="font-bold text-white">Mode du Hero</p>
          <p className="text-zinc-400 text-sm mt-0.5">
            {mode === 'auto' ? 'Les 5 contenus les plus populaires automatiquement' : 'Tu choisis manuellement les contenus affichés'}
          </p>
        </div>
        <button
          onClick={toggleMode}
          disabled={saving}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            mode === 'auto'
              ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'auto' ? <Zap className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
          {mode === 'auto' ? 'Automatique' : 'Manuel'}
        </button>
      </div>

      {/* Sélection manuelle */}
      <AnimatePresence>
        {mode === 'manual' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-5"
          >

            {/* Items actuels */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-white">Contenus sélectionnés <span className="text-zinc-500 font-normal">({items.length}/5)</span></p>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Film className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-sm">Aucun contenu sélectionné</p>
                  <p className="text-zinc-700 text-xs mt-1">Recherche ci-dessous pour en ajouter jusqu&apos;à 5</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 bg-zinc-800 rounded-xl p-3 group"
                    >
                      <GripVertical className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                      <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0">
                        {item.poster_path
                          ? <Image src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt={item.title} fill className="object-cover" sizes="40px" />
                          : <div className="w-full h-full flex items-center justify-center">{item.type === 'movie' ? <Film className="w-4 h-4 text-zinc-500" /> : <Tv className="w-4 h-4 text-zinc-500" />}</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{item.title}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.type === 'movie' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          {item.type === 'movie' ? 'FILM' : 'SÉRIE'}
                        </span>
                      </div>
                      <span className="text-zinc-600 text-xs font-bold w-5 text-center">#{i + 1}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-red-500/15 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Recherche */}
            {items.length < 5 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="font-semibold text-white mb-4">Ajouter un contenu</p>

                <div className="flex gap-3 mb-4">
                  <div className="flex-1 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5">
                    <Search className="w-4 h-4 text-zinc-500 shrink-0" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un film ou une série..."
                      className="bg-transparent text-white text-sm outline-none flex-1 placeholder-zinc-600"
                    />
                    {searching && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin shrink-0" />}
                    {searchQuery && <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}><X className="w-3.5 h-3.5 text-zinc-500 hover:text-white" /></button>}
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-zinc-700">
                    {[{ v: 'movie', label: 'Films', icon: Film }, { v: 'tv', label: 'Séries', icon: Tv }].map(({ v, label, icon: Icon }) => (
                      <button key={v} onClick={() => setSearchType(v as any)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all ${searchType === v ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}>
                        <Icon className="w-3.5 h-3.5" />{label}
                      </button>
                    ))}
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {searchResults.map(result => {
                      const title = result.title || result.name || ''
                      const already = alreadyAdded.has(result.id)
                      const isAdding = addingId === result.id
                      return (
                        <motion.div key={result.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 hover:border-zinc-500 transition-all">
                          <div className="relative aspect-[2/3] bg-zinc-700">
                            {result.poster_path
                              ? <Image src={`https://image.tmdb.org/t/p/w185${result.poster_path}`} alt={title} fill className="object-cover" sizes="150px" />
                              : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-zinc-600" /></div>
                            }
                          </div>
                          <div className="p-2.5">
                            <p className="text-white text-xs font-semibold truncate mb-2">{title}</p>
                            <button
                              onClick={() => !already && !isAdding && addItem(result)}
                              disabled={already || isAdding}
                              className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                already ? 'bg-green-900/30 text-green-400 cursor-default' :
                                isAdding ? 'bg-zinc-700 text-zinc-500 cursor-wait' :
                                'bg-red-600 hover:bg-red-500 text-white'
                              }`}
                            >
                              {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> :
                               already ? '✓ Ajouté' :
                               <><Plus className="w-3 h-3" /> Ajouter</>}
                            </button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'auto' && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 text-center">
          <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Mode automatique actif</p>
          <p className="text-zinc-500 text-sm mt-1">Le hero affiche les 5 contenus les plus populaires de ton catalogue</p>
          <p className="text-zinc-600 text-xs mt-2">Clique sur &quot;Automatique&quot; pour passer en mode manuel</p>
        </div>
      )}

    </div>
  )
}
