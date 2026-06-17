'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Film, Tv, Users, Globe, Clock, RefreshCw, ChevronDown, ChevronUp, X, Wifi } from 'lucide-react'
import Image from 'next/image'

interface ActiveSession {
  id: string
  ip: string
  city: string
  country: string
  region: string
  username: string | null
  content_type: 'movie' | 'series'
  tmdb_id: number
  title: string
  poster: string | null
  season: number | null
  episode: number | null
  last_seen: string
}

interface UniqueIP {
  ip: string
  city: string
  country: string
  username: string | null
}

interface IPHistory {
  ip: string
  city: string
  country: string
  username: string | null
  content_type: string
  title: string
  viewed_at: string
}

export default function AdminStatsPage() {
  const [active, setActive] = useState<ActiveSession[]>([])
  const [uniqueIPs, setUniqueIPs] = useState<UniqueIP[]>([])
  const [selectedIP, setSelectedIP] = useState<string | null>(null)
  const [ipHistory, setIPHistory] = useState<IPHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) return
      const data = await res.json()
      setActive(data.active || [])
      setUniqueIPs(data.uniqueIPs || [])
      setLastRefresh(new Date())
    } catch {}
    setLoading(false)
  }, [])

  const fetchIPHistory = async (ip: string) => {
    setLoadingHistory(true)
    setSelectedIP(ip)
    try {
      const res = await fetch(`/api/admin/stats?ip=${encodeURIComponent(ip)}`)
      const data = await res.json()
      setIPHistory(data.history || [])
    } catch {}
    setLoadingHistory(false)
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 15000) // refresh toutes les 15s
    return () => clearInterval(interval)
  }, [fetchStats])

  const movies = active.filter(s => s.content_type === 'movie')
  const series = active.filter(s => s.content_type === 'series')

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `il y a ${diff}s`
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)}m`
    return `il y a ${Math.floor(diff / 3600)}h`
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-6 space-y-8 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stats Actifs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mise à jour automatique · dernière sync {lastRefresh.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* ── KPIs en cours ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Spectateurs actifs', value: active.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Films en cours', value: movies.length, icon: Film, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Séries en cours', value: series.length, icon: Tv, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'IPs distinctes (24h)', value: uniqueIPs.length, icon: Globe, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Contenu en cours de visionnage ── */}
      {active.length > 0 && (
        <div className="space-y-4">
          {movies.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Film className="w-4 h-4" /> Films en visionnage ({movies.length})
              </h2>
              <div className="flex flex-wrap gap-3">
                {[...new Map(movies.map(s => [s.tmdb_id, s])).values()].map(s => (
                  <div key={s.tmdb_id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2">
                    {s.poster && (
                      <Image src={`https://image.tmdb.org/t/p/w92${s.poster}`} alt={s.title} width={28} height={42} className="rounded object-cover" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-foreground">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {movies.filter(m => m.tmdb_id === s.tmdb_id).length} spectateur(s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {series.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tv className="w-4 h-4" /> Séries en visionnage ({series.length})
              </h2>
              <div className="flex flex-wrap gap-3">
                {[...new Map(series.map(s => [s.tmdb_id, s])).values()].map(s => (
                  <div key={s.tmdb_id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2">
                    {s.poster && (
                      <Image src={`https://image.tmdb.org/t/p/w92${s.poster}`} alt={s.title} width={28} height={42} className="rounded object-cover" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-foreground">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {series.filter(m => m.tmdb_id === s.tmdb_id).length} spectateur(s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Utilisateurs actifs en ce moment ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-green-400" /> Actifs maintenant ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
            Aucun spectateur actif en ce moment
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">IP</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Ville</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">En train de regarder</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Vu</th>
                </tr>
              </thead>
              <tbody>
                {active.map((s, i) => (
                  <tr key={s.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${i === active.length - 1 ? 'border-0' : ''}`}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => fetchIPHistory(s.ip)}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {s.ip}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {s.city}{s.country ? `, ${s.country}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      {s.username
                        ? <span className="text-foreground font-medium">{s.username}</span>
                        : <span className="text-muted-foreground text-xs">Anonyme</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.poster && (
                          <Image src={`https://image.tmdb.org/t/p/w92${s.poster}`} alt={s.title} width={20} height={30} className="rounded object-cover flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-medium text-foreground text-xs">{s.title}</div>
                          {s.content_type === 'series' && s.season && (
                            <div className="text-muted-foreground text-xs">S{String(s.season).padStart(2,'0')}E{String(s.episode).padStart(2,'0')}</div>
                          )}
                        </div>
                        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded ${s.content_type === 'movie' ? 'bg-purple-500/15 text-purple-400' : 'bg-green-500/15 text-green-400'}`}>
                          {s.content_type === 'movie' ? 'Film' : 'Série'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        {timeAgo(s.last_seen)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Historique IPs (24h) ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Historique IP (24h) — {uniqueIPs.length} IP(s) distincte(s)
        </h2>
        {uniqueIPs.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
            Aucun historique disponible
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">IP</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Ville</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {uniqueIPs.map((ip, i) => (
                  <tr key={ip.ip} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${i === uniqueIPs.length - 1 ? 'border-0' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-foreground">{ip.ip}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {ip.city}{ip.country ? `, ${ip.country}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      {ip.username
                        ? <span className="text-foreground font-medium text-xs">{ip.username}</span>
                        : <span className="text-muted-foreground text-xs">Anonyme</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => fetchIPHistory(ip.ip)}
                        className="text-xs px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors font-medium"
                      >
                        Voir historique
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal historique IP ── */}
      <AnimatePresence>
        {selectedIP && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedIP(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h3 className="font-semibold text-foreground">Historique · {selectedIP}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{ipHistory.length} entrée(s)</p>
                </div>
                <button onClick={() => setSelectedIP(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : ipHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Aucun historique</p>
                ) : (
                  ipHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-secondary/30 rounded-xl">
                      <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${h.content_type === 'movie' ? 'bg-purple-500/15 text-purple-400' : 'bg-green-500/15 text-green-400'}`}>
                        {h.content_type === 'movie' ? 'Film' : 'Série'}
                      </span>
                      <span className="text-sm text-foreground flex-1 truncate font-medium">{h.title}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(h.viewed_at)}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
