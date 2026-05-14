'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Film, Tv, Search, Plus, Trash2, Edit, ExternalLink, Star, Loader2, X, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

interface TMDBResult {
  id: number
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  popularity: number
}

interface ContentItem {
  id: number
  tmdb_id: number
  title?: string
  name?: string
  poster_path: string | null
  vote_average: number
  video_url: string | null
  release_date?: string
  first_air_date?: string
}

interface AdminContentManagerProps {
  type: 'movie' | 'series'
  title: string
  items: ContentItem[]
}

export function AdminContentManager({ type, title, items: initialItems }: AdminContentManagerProps) {
  const [items, setItems] = useState<ContentItem[]>(initialItems)
  const [search, setSearch] = useState('')
  const [tmdbSearch, setTmdbSearch] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editVideoUrl, setEditVideoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const Icon = type === 'movie' ? Film : Tv

  const filteredItems = items.filter(item => {
    const name = item.title || item.name || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const searchTMDB = async () => {
    if (!tmdbSearch.trim()) return
    setSearching(true)
    try {
      const endpoint = type === 'movie' ? 'movie' : 'tv'
      const res = await fetch(`/api/auth/admin/tmdb-search?q=${encodeURIComponent(tmdbSearch)}&type=${endpoint}`)
      const data = await res.json()
      setTmdbResults(data.results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const addContent = async (result: TMDBResult, videoUrl: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/auth/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, tmdbData: result, videoUrl }),
      })
      if (res.ok) {
        const newItem = await res.json()
        setItems(prev => [newItem, ...prev])
        setShowAddPanel(false)
        setTmdbResults([])
        setTmdbSearch('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const updateVideoUrl = async (id: number, tmdbId: number) => {
    setSaving(true)
    try {
      const res = await fetch('/api/auth/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, tmdbId, videoUrl: editVideoUrl }),
      })
      if (res.ok) {
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, video_url: editVideoUrl } : item
        ))
        setEditingId(null)
        setEditVideoUrl('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const deleteContent = async (id: number, tmdbId: number) => {
    if (!confirm('Supprimer ce contenu ?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/auth/admin/content?type=${type}&tmdbId=${tmdbId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Icon className="w-8 h-8 text-primary" />
              {title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {items.length} {type === 'movie' ? 'film' : 'série'}{items.length > 1 ? 's' : ''} dans la base
            </p>
          </div>
          <Button onClick={() => setShowAddPanel(!showAddPanel)} className="gap-2">
            <Plus className="w-4 h-4" />
            Ajouter
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
                  <h2 className="text-lg font-semibold">Rechercher sur TMDB</h2>
                  <Button variant="ghost" size="icon" onClick={() => { setShowAddPanel(false); setTmdbResults([]) }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* TMDB Search */}
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder={`Rechercher un ${type === 'movie' ? 'film' : 'une série'}...`}
                    value={tmdbSearch}
                    onChange={e => setTmdbSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchTMDB()}
                  />
                  <Button onClick={searchTMDB} disabled={searching}>
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {/* TMDB Results */}
                {tmdbResults.length > 0 && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tmdbResults.map(result => (
                      <TMDBResultRow
                        key={result.id}
                        result={result}
                        type={type}
                        onAdd={addContent}
                        saving={saving}
                        alreadyAdded={items.some(i => i.tmdb_id === result.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search existing */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Filtrer le catalogue..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Content list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredItems.map((item, index) => {
            const name = item.title || item.name || ''
            const date = item.release_date || item.first_air_date || ''
            const year = date ? new Date(date).getFullYear() : ''
            const posterUrl = item.poster_path
              ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
              : '/images/placeholder-poster.jpg'

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className="overflow-hidden hover:border-primary/50 transition-colors">
                  <CardContent className="p-0">
                    <div className="flex gap-3">
                      {/* Poster */}
                      <div className="relative w-20 h-28 flex-shrink-0">
                        <Image src={posterUrl} alt={name} fill className="object-cover" sizes="80px" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 py-3 pr-3">
                        <h3 className="font-semibold text-foreground line-clamp-1 text-sm mb-1">{name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          {year && <Badge variant="secondary" className="text-xs">{year}</Badge>}
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-muted-foreground">{item.vote_average?.toFixed(1) ?? 'N/A'}</span>
                          </div>
                        </div>

                        {/* Video URL */}
                        {editingId === item.id ? (
                          <div className="flex gap-1 mt-2">
                            <Input
                              value={editVideoUrl}
                              onChange={e => setEditVideoUrl(e.target.value)}
                              placeholder="https://..."
                              className="h-7 text-xs"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => updateVideoUrl(item.id, item.tmdb_id)}
                              disabled={saving}
                            >
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              onClick={() => { setEditingId(null); setEditVideoUrl('') }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mt-2">
                            <div
                              className={`text-xs px-2 py-0.5 rounded flex-1 truncate cursor-pointer border ${item.video_url
                                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                  : 'border-red-500/30 bg-red-500/10 text-red-400'
                                }`}
                              onClick={() => { setEditingId(item.id); setEditVideoUrl(item.video_url || '') }}
                            >
                              {item.video_url ? '✓ Lien MP4 défini' : '✗ Pas de lien'}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0"
                              onClick={() => { setEditingId(item.id); setEditVideoUrl(item.video_url || '') }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => deleteContent(item.id, item.tmdb_id)}
                              disabled={deleting === item.id}
                            >
                              {deleting === item.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Trash2 className="w-3 h-3" />
                              }
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20">
          <Icon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {items.length === 0
              ? `Aucun ${type === 'movie' ? 'film' : 'série'} — cliquez sur "Ajouter" pour commencer`
              : 'Aucun résultat'
            }
          </p>
        </div>
      )}
    </div>
  )
}

function TMDBResultRow({
  result,
  type,
  onAdd,
  saving,
  alreadyAdded,
}: {
  result: TMDBResult
  type: 'movie' | 'series'
  onAdd: (result: TMDBResult, videoUrl: string) => void
  saving: boolean
  alreadyAdded: boolean
}) {
  const [videoUrl, setVideoUrl] = useState('')
  const name = result.title || result.name || ''
  const date = result.release_date || result.first_air_date || ''
  const year = date ? new Date(date).getFullYear() : ''
  const posterUrl = result.poster_path
    ? `https://image.tmdb.org/t/p/w92${result.poster_path}`
    : '/images/placeholder-poster.jpg'

  return (
    <div className="flex gap-3 p-3 bg-background rounded-lg border border-border">
      <div className="relative w-12 h-16 flex-shrink-0">
        <Image src={posterUrl} alt={name} fill className="object-cover rounded" sizes="48px" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-sm truncate">{name}</p>
          {year && <span className="text-xs text-muted-foreground shrink-0">{year}</span>}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          {result.vote_average?.toFixed(1)}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Lien MP4 (optionnel)"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            className="h-7 text-xs"
          />
          <Button
            size="sm"
            className="h-7 shrink-0"
            onClick={() => onAdd(result, videoUrl)}
            disabled={saving || alreadyAdded}
          >
            {alreadyAdded ? (
              <><Check className="w-3 h-3 mr-1" /> Ajouté</>
            ) : saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <><Plus className="w-3 h-3 mr-1" /> Ajouter</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}