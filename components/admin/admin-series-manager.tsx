'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tv, Search, Plus, Trash2, Edit, Star, Loader2, X, Check,
  ChevronDown, ChevronUp, Film, Download
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

interface TMDBResult {
  id: number
  name: string
  overview: string
  poster_path: string | null
  first_air_date?: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  popularity: number
}

interface Episode {
  id: number
  series_id: number
  season_number: number
  episode_number: number
  title: string | null
  video_url: string | null
  download_url: string | null
}

interface SeriesItem {
  id: number
  tmdb_id: number
  name: string
  poster_path: string | null
  vote_average: number
  first_air_date?: string
  number_of_seasons: number
}

interface AdminSeriesManagerProps {
  items: SeriesItem[]
}

export function AdminSeriesManager({ items: initialItems }: AdminSeriesManagerProps) {
  const [items, setItems] = useState<SeriesItem[]>(initialItems)
  const [search, setSearch] = useState('')
  const [tmdbSearch, setTmdbSearch] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [importing, setImporting] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  // Episodes panel
  const [expandedSeries, setExpandedSeries] = useState<number | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)
  const [editingEpisode, setEditingEpisode] = useState<number | null>(null)
  const [editVideoUrl, setEditVideoUrl] = useState('')
  const [savingEpisode, setSavingEpisode] = useState(false)
  const [editingEpisodeDownload, setEditingEpisodeDownload] = useState<number | null>(null)
  const [editDownloadUrl, setEditDownloadUrl] = useState('')
  const [resolvingEpisode, setResolvingEpisode] = useState<number | null>(null)
  const [speedMode, setSpeedMode] = useState(false)
  const [speedText, setSpeedText] = useState('')
  const [speedSaving, setSpeedSaving] = useState(false)
  const [seasonFilter, setSeasonFilter] = useState(1)

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const searchTMDB = async () => {
    if (!tmdbSearch.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/auth/admin/tmdb-search?q=${encodeURIComponent(tmdbSearch)}&type=tv`)
      const data = await res.json()
      setTmdbResults(data.results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const importSeries = async (result: TMDBResult) => {
    setImporting(result.id)
    try {
      const res = await fetch('/api/auth/admin/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId: result.id }),
      })
      const data = await res.json()
      if (data.success) {
        setItems(prev => {
          const exists = prev.find(i => i.tmdb_id === result.id)
          if (exists) return prev
          return [data.series, ...prev]
        })
        setShowAddPanel(false)
        setTmdbResults([])
        setTmdbSearch('')
        alert(`✅ ${result.name} importée avec ${data.episodes} épisodes sur ${data.seasons} saisons !`)
      } else {
        alert('Erreur : ' + data.error)
      }
    } catch (err) {
      console.error(err)
      alert('Erreur lors de l\'importation')
    } finally {
      setImporting(null)
    }
  }

  const loadEpisodes = async (seriesId: number, seriesDbId: number) => {
    if (expandedSeries === seriesDbId) {
      setExpandedSeries(null)
      return
    }
    setExpandedSeries(seriesDbId)
    setLoadingEpisodes(true)
    setSeasonFilter(1)
    try {
      const res = await fetch(`/api/auth/admin/episodes?seriesId=${seriesDbId}`)
      const data = await res.json()
      setEpisodes(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingEpisodes(false)
    }
  }

  const saveEpisodeUrl = async (episodeId: number) => {
    setSavingEpisode(true)
    try {
      const res = await fetch('/api/auth/admin/episodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId, videoUrl: editVideoUrl }),
      })
      if (res.ok) {
        setEpisodes(prev => prev.map(ep =>
          ep.id === episodeId ? { ...ep, video_url: editVideoUrl } : ep
        ))
        setEditingEpisode(null)
        setEditVideoUrl('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingEpisode(false)
    }
  }

  const resolveAndSaveEpisodeDownload = async (episodeId: number) => {
    if (!editDownloadUrl.trim()) return
    setResolvingEpisode(episodeId)
    try {
      // On sauvegarde le lien fileditchfiles tel quel — la résolution se fait à chaque téléchargement
      const finalUrl = editDownloadUrl.trim()
      const res = await fetch('/api/auth/admin/episodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId, downloadUrl: finalUrl }),
      })
      if (res.ok) {
        setEpisodes(prev => prev.map(ep =>
          ep.id === episodeId ? { ...ep, download_url: finalUrl } : ep
        ))
        setEditingEpisodeDownload(null)
        setEditDownloadUrl('')
      }
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    } finally {
      setResolvingEpisode(null)
    }
  }

  const speedImport = async () => {
    if (!speedText.trim() || expandedSeries === null) return
    setSpeedSaving(true)
    const lines = speedText.trim().split('\n')
    const parsed: { episodeNumber: number; url: string }[] = []
    for (const line of lines) {
      const match = line.trim().match(/^(\d+)\s+(https?:\/\/.+)$/)
      if (match) parsed.push({ episodeNumber: parseInt(match[1]), url: match[2].trim() })
    }
    if (parsed.length === 0) { alert('Aucune ligne valide — format attendu : "1 https://..."'); setSpeedSaving(false); return }
    let saved = 0
    for (const { episodeNumber, url } of parsed) {
      const ep = episodes.find(e => e.season_number === seasonFilter && e.episode_number === episodeNumber)
      if (!ep) continue
      const res = await fetch('/api/auth/admin/episodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId: ep.id, videoUrl: url }),
      })
      if (res.ok) {
        setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, video_url: url } : e))
        saved++
      }
    }
    setSpeedText('')
    setSpeedMode(false)
    setSpeedSaving(false)
    alert(`✅ ${saved} épisode(s) mis à jour sur ${parsed.length} lignes parsées !`)
  }

  const deleteSeries = async (id: number, tmdbId: number) => {
    if (!confirm('Supprimer cette série et tous ses épisodes ?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/auth/admin/content?type=series&tmdbId=${tmdbId}`, { method: 'DELETE' })
      if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(null)
    }
  }

  const seasons = [...new Set(episodes.map(ep => ep.season_number))].sort((a, b) => a - b)
  const filteredEpisodes = episodes.filter(ep => ep.season_number === seasonFilter)

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Tv className="w-8 h-8 text-primary" />
              Séries
            </h1>
            <p className="text-muted-foreground mt-1">{items.length} série{items.length > 1 ? 's' : ''} dans la base</p>
          </div>
          <Button onClick={() => setShowAddPanel(!showAddPanel)} className="gap-2">
            <Plus className="w-4 h-4" />
            Ajouter une série
          </Button>
        </div>
      </motion.div>

      {/* Add Panel */}
      <AnimatePresence>
        {showAddPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Rechercher sur TMDB</h2>
                    <p className="text-sm text-muted-foreground">
                      Les saisons et épisodes seront importés automatiquement
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setShowAddPanel(false); setTmdbResults([]) }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Rechercher une série..."
                    value={tmdbSearch}
                    onChange={e => setTmdbSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchTMDB()}
                  />
                  <Button onClick={searchTMDB} disabled={searching}>
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {tmdbResults.length > 0 && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tmdbResults.map(result => (
                      <div key={result.id} className="flex gap-3 p-3 bg-background rounded-lg border border-border">
                        <div className="relative w-12 h-16 flex-shrink-0">
                          <Image
                            src={result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : '/images/placeholder-poster.jpg'}
                            alt={result.name}
                            fill
                            className="object-cover rounded"
                            sizes="48px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{result.name}</p>
                            {result.first_air_date && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {new Date(result.first_air_date).getFullYear()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            {result.vote_average?.toFixed(1)}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{result.overview}</p>
                        </div>
                        <Button
                          size="sm"
                          className="h-8 shrink-0 gap-1"
                          onClick={() => importSeries(result)}
                          disabled={importing === result.id || items.some(i => i.tmdb_id === result.id)}
                        >
                          {importing === result.id ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Import...</>
                          ) : items.some(i => i.tmdb_id === result.id) ? (
                            <><Check className="w-3 h-3" /> Ajoutée</>
                          ) : (
                            <><Download className="w-3 h-3" /> Importer</>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Filtrer les séries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Series list */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredItems.map((item, index) => {
            const year = item.first_air_date ? new Date(item.first_air_date).getFullYear() : ''
            const posterUrl = item.poster_path
              ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
              : '/images/placeholder-poster.jpg'
            const isExpanded = expandedSeries === item.id
            const episodesWithUrl = episodes.filter(ep => ep.video_url).length
            const totalEps = isExpanded ? episodes.length : 0

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className={`overflow-hidden transition-colors ${isExpanded ? 'border-primary/50' : 'hover:border-primary/30'}`}>
                  <CardContent className="p-0">
                    {/* Series header */}
                    <div className="flex gap-3 p-4">
                      <div className="relative w-16 h-24 flex-shrink-0">
                        <Image src={posterUrl} alt={item.name} fill className="object-cover rounded-lg" sizes="64px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-1">{item.name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          {year && <Badge variant="secondary" className="text-xs">{year}</Badge>}
                          <Badge variant="outline" className="text-xs">
                            {item.number_of_seasons} saison{item.number_of_seasons > 1 ? 's' : ''}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-muted-foreground">{item.vote_average?.toFixed(1) ?? 'N/A'}</span>
                          </div>
                        </div>
                        {isExpanded && totalEps > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {episodesWithUrl}/{totalEps} épisodes avec lien vidéo
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => loadEpisodes(item.tmdb_id, item.id)}
                        >
                          {isExpanded ? (
                            <><ChevronUp className="w-4 h-4" /> Fermer</>
                          ) : (
                            <><ChevronDown className="w-4 h-4" /> Épisodes</>
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() => deleteSeries(item.id, item.tmdb_id)}
                          disabled={deleting === item.id}
                        >
                          {deleting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Episodes panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border overflow-hidden"
                        >
                          <div className="p-4">
                            {loadingEpisodes ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                              </div>
                            ) : episodes.length === 0 ? (
                              <p className="text-muted-foreground text-sm text-center py-4">
                                Aucun épisode — réimportez la série
                              </p>
                            ) : (
                              <>
                                {/* Season tabs + Speed Série */}
                                <div className="flex items-center gap-2 mb-4 flex-wrap justify-between">
                                  <div className="flex gap-2 flex-wrap">
                                    {seasons.map(s => (
                                      <button
                                        key={s}
                                        onClick={() => { setSeasonFilter(s); setSpeedMode(false); setSpeedText('') }}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                          seasonFilter === s
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                        }`}
                                      >
                                        Saison {s}
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    onClick={() => { setSpeedMode(!speedMode); setSpeedText('') }}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
                                      speedMode
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                    }`}
                                  >
                                    ⚡ Speed Série
                                  </button>
                                </div>

                                {/* Speed Série panel */}
                                {speedMode && (
                                  <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                                    <p className="text-orange-400 text-xs font-semibold mb-2">
                                      ⚡ Colle tes liens — format : <code className="bg-black/30 px-1 rounded">numéro url</code> (une ligne par épisode)
                                    </p>
                                    <textarea
                                      value={speedText}
                                      onChange={e => setSpeedText(e.target.value)}
                                      placeholder={"1 https://...\n2 https://...\n3 https://..."}
                                      rows={6}
                                      className="w-full bg-black/30 border border-orange-500/30 rounded-lg p-3 text-xs text-white font-mono placeholder-white/30 outline-none focus:border-orange-500/60 resize-none mb-3"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => { setSpeedMode(false); setSpeedText('') }}
                                        className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white transition-colors"
                                      >
                                        Annuler
                                      </button>
                                      <button
                                        onClick={speedImport}
                                        disabled={speedSaving || !speedText.trim()}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50"
                                      >
                                        {speedSaving ? <><Loader2 className="w-3 h-3 animate-spin" /> Sauvegarde...</> : '⚡ Importer tout'}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Episodes list */}
                                <div className="space-y-2">
                                  {filteredEpisodes.map(ep => (
                                    <div
                                      key={ep.id}
                                      className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg"
                                    >
                                      <span className="text-muted-foreground text-sm font-mono w-8 shrink-0">
                                        E{ep.episode_number.toString().padStart(2, '0')}
                                      </span>
                                      <span className="text-sm font-medium flex-1 truncate">
                                        {ep.title || `Épisode ${ep.episode_number}`}
                                      </span>

                                      {editingEpisode === ep.id ? (
                                        <div className="flex gap-1 flex-1 max-w-sm">
                                          <Input
                                            value={editVideoUrl}
                                            onChange={e => setEditVideoUrl(e.target.value)}
                                            placeholder="https://...mp4"
                                            className="h-7 text-xs"
                                            autoFocus
                                          />
                                          <Button
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => saveEpisodeUrl(ep.id)}
                                            disabled={savingEpisode}
                                          >
                                            {savingEpisode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => { setEditingEpisode(null); setEditVideoUrl('') }}
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div
                                          className={`text-xs px-2 py-1 rounded cursor-pointer border flex items-center gap-1 shrink-0 ${
                                            ep.video_url
                                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                              : 'border-red-500/30 bg-red-500/10 text-red-400'
                                          }`}
                                          onClick={() => {
                                            setEditingEpisode(ep.id)
                                            setEditVideoUrl(ep.video_url || '')
                                          }}
                                        >
                                          {ep.video_url ? '✓ Lien' : '+ Lien'}
                                        </div>
                                      )}

                                      {/* Download URL button */}
                                      {editingEpisodeDownload === ep.id ? (
                                        <div className="flex gap-1 flex-1 max-w-sm">
                                          <Input
                                            value={editDownloadUrl}
                                            onChange={e => setEditDownloadUrl(e.target.value)}
                                            placeholder="Clic droit vidéo → Copier l'adresse"
                                            className="h-7 text-xs"
                                            autoFocus
                                          />
                                          <Button
                                            size="icon"
                                            className="h-7 w-7 shrink-0 bg-blue-600 hover:bg-blue-500"
                                            onClick={() => resolveAndSaveEpisodeDownload(ep.id)}
                                            disabled={resolvingEpisode === ep.id}
                                          >
                                            {resolvingEpisode === ep.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => { setEditingEpisodeDownload(null); setEditDownloadUrl('') }}
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div
                                          className={`text-xs px-2 py-1 rounded cursor-pointer border flex items-center gap-1 shrink-0 ${
                                            ep.download_url
                                              ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                                              : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
                                          }`}
                                          onClick={() => {
                                            setEditingEpisodeDownload(ep.id)
                                            setEditDownloadUrl(ep.download_url || '')
                                          }}
                                        >
                                          <Download className="w-3 h-3" />
                                          {ep.download_url ? 'DL ✓' : 'DL'}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20">
          <Tv className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {items.length === 0
              ? 'Aucune série — cliquez sur "Ajouter une série" pour commencer'
              : 'Aucun résultat'}
          </p>
        </div>
      )}
    </div>
  )
}