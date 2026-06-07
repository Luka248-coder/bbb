'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Search, Plus, CheckCircle2, XCircle, Loader2, Play, Pause,
  RefreshCw, Film, Tv, Zap, BarChart3, AlertTriangle, Trash2
} from 'lucide-react'

const TMDB_KEY = '1a6aed55d15f2da7f2f0ff0586c52174'
const TMDB = 'https://api.themoviedb.org/3'

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
  genre_ids: number[]
  popularity: number
}

interface VerifItem {
  tmdb_id: number
  title: string
  popularity: number
}

interface VerifStats {
  total_tmdb: number
  in_catalogue: number
  already_checked: number
  pending: number
  items: VerifItem[]
}

export default function ApiCataloguePage() {
  const [tab, setTab] = useState<'search' | 'verif'>('search')

  // ── Search tab ──
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'movie' | 'tv'>('movie')
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())
  const [addingId, setAddingId] = useState<number | null>(null)
  const [existingIds, setExistingIds] = useState<Set<number>>(new Set())
  const searchTimeout = useRef<NodeJS.Timeout>()

  // ── Verification tab ──
  const [verifType, setVerifType] = useState<'movie' | 'series'>('movie')
  const [verifStats, setVerifStats] = useState<VerifStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentItem, setCurrentItem] = useState<string>('')
  const [results, setResults] = useState<{ title: string; available: boolean }[]>([])
  const [foundCount, setFoundCount] = useState(0)
  const [checkedCount, setCheckedCount] = useState(0)
  const pauseRef = useRef(false)
  const runningRef = useRef(false)

  // ── Search ──
  const doSearch = useCallback(async (q: string, type: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`${TMDB}/search/${type}?api_key=${TMDB_KEY}&language=fr-FR&query=${encodeURIComponent(q)}&page=1`)
      const data = await res.json()
      const items: TMDBResult[] = (data.results || []).slice(0, 12)
      setSearchResults(items)

      // Check which ones are already in catalogue
      const table = type === 'movie' ? 'movie' : 'series'
      const checks = await Promise.all(items.map(async (item) => {
        const r = await fetch(`/api/auth/admin/api-catalogue?tmdbId=${item.id}&type=${table}`)
        const d = await r.json()
        return d.exists ? item.id : null
      }))
      setExistingIds(new Set(checks.filter(Boolean) as number[]))
    } catch {}
    setSearching(false)
  }, [])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(searchQuery, searchType), 500)
  }, [searchQuery, searchType, doSearch])

  const addToCatalogue = async (item: TMDBResult) => {
    setAddingId(item.id)
    try {
      const type = searchType === 'movie' ? 'movie' : 'series'
      const res = await fetch('/api/auth/admin/api-catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, tmdbId: item.id })
      })
      if (res.ok) {
        setAddedIds(prev => new Set([...prev, item.id]))
        setExistingIds(prev => new Set([...prev, item.id]))
      }
    } catch {}
    setAddingId(null)
  }

  // ── Verification ──
  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/auth/admin/purstream-check?type=${verifType}`)
      const data = await res.json()
      setVerifStats(data)
    } catch {}
    setLoadingStats(false)
  }

  useEffect(() => { if (tab === 'verif') loadStats() }, [tab, verifType])

  const startVerification = async () => {
    if (!verifStats || verifStats.items.length === 0) return
    setRunning(true)
    runningRef.current = true
    pauseRef.current = false
    setPaused(false)
    setResults([])
    setFoundCount(0)
    setCheckedCount(0)

    const items = verifStats.items
    const total = items.length

    for (let i = 0; i < items.length; i++) {
      // Wait while paused
      while (pauseRef.current) { await new Promise(r => setTimeout(r, 300)) }
      if (!runningRef.current) break

      const item = items[i]
      setCurrentItem(item.title)
      setProgress(Math.round((i / total) * 100))

      try {
        const res = await fetch('/api/auth/admin/purstream-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_id: item.tmdb_id, title: item.title, type: verifType })
        })
        const data = await res.json()

        setCheckedCount(i + 1)
        if (data.available) {
          setFoundCount(f => f + 1)
          setResults(prev => [{ title: item.title, available: true }, ...prev].slice(0, 50))
        }
      } catch {}

      // Small delay to avoid hammering API
      await new Promise(r => setTimeout(r, 400))
    }

    setProgress(100)
    setCurrentItem('')
    setRunning(false)
    runningRef.current = false
    loadStats()
  }

  const togglePause = () => {
    pauseRef.current = !pauseRef.current
    setPaused(pauseRef.current)
  }

  const stopVerification = () => {
    runningRef.current = false
    pauseRef.current = false
    setRunning(false)
    setPaused(false)
    setCurrentItem('')
    loadStats()
  }

  const resetVerification = async () => {
    if (!confirm(`Réinitialiser la vérification pour les ${verifType === 'movie' ? 'films' : 'séries'} ?`)) return
    await fetch(`/api/auth/admin/purstream-check?type=${verifType}`, { method: 'DELETE' })
    loadStats()
    setResults([])
    setProgress(0)
    setCheckedCount(0)
    setFoundCount(0)
  }

  const year = (d?: string) => d ? new Date(d).getFullYear() : ''

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">API Catalogue</h1>
          <p className="text-zinc-400 text-sm">Ajouter des contenus sans lien vidéo — ils seront streamés via Purstream automatiquement</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'search', label: 'Rechercher & Ajouter', icon: Search },
            { id: 'verif', label: 'Vérification API', icon: Zap },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${tab === id ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* ── SEARCH TAB ── */}
        {tab === 'search' && (
          <div className="space-y-6">
            {/* Search controls */}
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                <Search className="w-4 h-4 text-zinc-500 shrink-0" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un film ou une série TMDB..."
                  className="bg-transparent text-white text-sm outline-none flex-1 placeholder-zinc-600"
                />
                {searching && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin shrink-0" />}
              </div>
              <div className="flex rounded-xl overflow-hidden border border-zinc-800">
                {[{ v: 'movie', label: 'Films', icon: Film }, { v: 'tv', label: 'Séries', icon: Tv }].map(({ v, label, icon: Icon }) => (
                  <button key={v} onClick={() => setSearchType(v as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all ${searchType === v ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results grid */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.map(item => {
                  const title = item.title || item.name || ''
                  const date = item.release_date || item.first_air_date
                  const inCatalogue = existingIds.has(item.id) || addedIds.has(item.id)
                  const isAdding = addingId === item.id
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all group">
                      {/* Poster */}
                      <div className="relative aspect-[2/3] bg-zinc-800">
                        {item.poster_path ? (
                          <Image src={`https://image.tmdb.org/t/p/w300${item.poster_path}`} alt={title} fill className="object-cover" sizes="200px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {searchType === 'movie' ? <Film className="w-8 h-8 text-zinc-700" /> : <Tv className="w-8 h-8 text-zinc-700" />}
                          </div>
                        )}
                        {/* In catalogue badge */}
                        {inCatalogue && (
                          <div className="absolute top-2 right-2 bg-green-600 rounded-full p-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className="font-bold text-sm truncate">{title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-zinc-500 text-xs">{year(date)}</span>
                          <span className="text-yellow-400 text-xs">★ {item.vote_average.toFixed(1)}</span>
                        </div>

                        {/* Add button */}
                        <button
                          onClick={() => !inCatalogue && addToCatalogue(item)}
                          disabled={inCatalogue || isAdding}
                          className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                            inCatalogue ? 'bg-green-900/40 text-green-400 cursor-default' :
                            isAdding ? 'bg-zinc-800 text-zinc-500 cursor-wait' :
                            'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
                          }`}
                        >
                          {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                           inCatalogue ? <><CheckCircle2 className="w-3.5 h-3.5" /> Déjà ajouté</> :
                           <><Plus className="w-3.5 h-3.5" /> Ajouter au catalogue</>}
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {!searchQuery && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center">
                  <Search className="w-7 h-7 text-zinc-700" />
                </div>
                <p className="text-zinc-500">Recherchez un titre pour l&apos;ajouter au catalogue</p>
                <p className="text-zinc-700 text-sm text-center max-w-sm">Les contenus ajoutés sans lien vidéo seront automatiquement streamés via l&apos;API Purstream lors de la lecture.</p>
              </div>
            )}
          </div>
        )}

        {/* ── VERIFICATION TAB ── */}
        {tab === 'verif' && (
          <div className="space-y-6">
            {/* Type selector */}
            <div className="flex gap-2">
              {[{ v: 'movie', label: 'Films', icon: Film }, { v: 'series', label: 'Séries', icon: Tv }].map(({ v, label, icon: Icon }) => (
                <button key={v} onClick={() => !running && setVerifType(v as any)}
                  disabled={running}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${verifType === v ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-50'}`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>

            {/* Stats card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              {loadingStats ? (
                <div className="flex items-center gap-3 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin" /><span>Chargement...</span></div>
              ) : verifStats ? (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Films TMDB trouvés', value: verifStats.total_tmdb, color: 'text-white' },
                      { label: 'Déjà au catalogue', value: verifStats.in_catalogue, color: 'text-blue-400' },
                      { label: 'Déjà vérifiés', value: verifStats.already_checked, color: 'text-zinc-400' },
                      { label: 'À vérifier', value: verifStats.pending, color: 'text-yellow-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-zinc-800 rounded-xl p-4 text-center">
                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                        <p className="text-zinc-500 text-xs mt-1">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-zinc-500 mb-2">
                      <span>Progression de la vérification</span>
                      <span>{verifStats.total_tmdb > 0 ? Math.round(((verifStats.in_catalogue + verifStats.already_checked) / verifStats.total_tmdb) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${verifStats.total_tmdb > 0 ? ((verifStats.in_catalogue + verifStats.already_checked) / verifStats.total_tmdb) * 100 : 0}%` }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 flex-wrap">
                    {!running ? (
                      <>
                        <button onClick={startVerification} disabled={verifStats.pending === 0}
                          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all">
                          <Zap className="w-4 h-4" />
                          {verifStats.pending === 0 ? 'Tout vérifié !' : `Vérifier ${verifStats.pending} nouveaux contenus`}
                        </button>
                        <button onClick={resetVerification}
                          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white transition-all">
                          <Trash2 className="w-4 h-4" /> Réinitialiser
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={togglePause}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${paused ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'}`}>
                          {paused ? <><Play className="w-4 h-4" /> Reprendre</> : <><Pause className="w-4 h-4" /> Pause</>}
                        </button>
                        <button onClick={stopVerification}
                          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white transition-all">
                          <XCircle className="w-4 h-4" /> Arrêter
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500">Erreur de chargement</p>
              )}
            </div>

            {/* Live progress */}
            <AnimatePresence>
              {running && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {paused ? <Pause className="w-4 h-4 text-yellow-400" /> : <Loader2 className="w-4 h-4 text-red-400 animate-spin" />}
                      <span className="font-semibold text-sm">{paused ? 'En pause' : 'Vérification en cours...'}</span>
                    </div>
                    <span className="text-zinc-400 text-sm">{checkedCount} vérifiés · <span className="text-green-400">{foundCount} disponibles</span></span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                      <span className="truncate max-w-xs">{currentItem || '...'}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-red-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results live */}
            {results.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="font-semibold text-sm mb-3 text-green-400">✓ Disponibles sur Purstream</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-white/80">{r.title}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="bg-blue-950/40 border border-blue-800/30 rounded-2xl p-5">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-300 text-sm mb-1">Comment ça marche</p>
                  <ul className="text-blue-300/60 text-xs space-y-1">
                    <li>• Cherche dans les tendances + populaires + mieux notés TMDB (~500 titres)</li>
                    <li>• Vérifie uniquement les contenus <strong>pas encore</strong> dans ton catalogue</li>
                    <li>• Si disponible sur Purstream → ajouté automatiquement au catalogue</li>
                    <li>• Progression sauvegardée — pause et reprise sans re-vérifier les déjà faits</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
