'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Film, Tv, CheckCircle, XCircle,
  Search, User, Calendar, TrendingUp, Hourglass, Ban
} from 'lucide-react'
import type { ContentRequest } from '@/lib/types'

const statusConfig = {
  pending:  { label: 'En attente', icon: Hourglass,   color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
  approved: { label: 'Approuvé',   icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  rejected: { label: 'Refusé',     icon: Ban,         color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20' },
}

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const
const FILTER_LABELS: Record<string, string> = {
  all: 'Toutes', pending: 'En attente', approved: 'Approuvées', rejected: 'Refusées',
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<ContentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => { fetchRequests() }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/requests')
      if (res.ok) setRequests(await res.json())
    } catch {}
    finally { setLoading(false) }
  }

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActionLoading(id + status)
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } catch {}
    finally { setActionLoading(null) }
  }

  const counts = {
    all:      requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  const filtered = requests
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.user?.username?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 md:p-8 min-h-screen">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Demandes de contenu</h1>
            <p className="text-white/40 text-sm">{counts.pending} en attente de traitement</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        {([
          { key: 'all',      label: 'Total',      icon: TrendingUp,  color: 'text-white/60',    bg: 'bg-white/5',        border: 'border-white/10' },
          { key: 'pending',  label: 'En attente', icon: Hourglass,   color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
          { key: 'approved', label: 'Approuvées', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
          { key: 'rejected', label: 'Refusées',   icon: Ban,         color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20' },
        ] as const).map(({ key, label, icon: Icon, color, bg, border }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`${bg} rounded-xl p-4 text-left border transition-all ${
              filter === key ? 'border-primary/50 ring-1 ring-primary/20' : `${border} hover:border-white/20`
            }`}
          >
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{counts[key]}</p>
          </button>
        ))}
      </motion.div>

      {/* Search + Filters */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par titre ou utilisateur…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <MessageSquare className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/40 font-medium">Aucune demande trouvée</p>
          <p className="text-white/20 text-sm mt-1">Modifie ton filtre ou ta recherche</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((request, index) => {
              const cfg = statusConfig[request.status]
              const StatusIcon = cfg.icon
              const avatarUrl = request.user?.avatar
                ? `https://cdn.discordapp.com/avatars/${request.user_id}/${request.user.avatar}.png`
                : null
              const posterUrl = request.poster
                ? `https://image.tmdb.org/t/p/w154${request.poster}`
                : null
              const isLoadingApprove = actionLoading === request.id + 'approved'
              const isLoadingReject  = actionLoading === request.id + 'rejected'

              return (
                <motion.div
                  key={request.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: index * 0.04 }}
                  className="group bg-white/[0.03] hover:bg-white/[0.055] border border-white/[0.07] hover:border-white/[0.13] rounded-2xl p-4 flex gap-4 transition-all"
                >
                  {/* Poster */}
                  <div className="flex-shrink-0 w-14 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 relative">
                    {posterUrl ? (
                      <Image
                        src={posterUrl}
                        alt={request.title || ''}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {request.content_type === 'movie'
                          ? <Film className="w-5 h-5 text-white/20" />
                          : <Tv   className="w-5 h-5 text-white/20" />
                        }
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h3 className="font-semibold text-white">{request.title}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10">
                            {request.content_type === 'movie' ? 'FILM' : 'SÉRIE'}
                          </span>
                        </div>

                        {request.description && (
                          <p className="text-white/40 text-sm line-clamp-1 mb-2">{request.description}</p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-white/30">
                          <div className="flex items-center gap-1.5">
                            {avatarUrl ? (
                              <Image src={avatarUrl} alt="" width={14} height={14} className="rounded-full" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            <span>{request.user?.username || 'Inconnu'}</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(request.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status + Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.border} border`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleAction(request.id, 'approved')}
                              disabled={!!actionLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {isLoadingApprove
                                ? <span className="w-3.5 h-3.5 border border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin inline-block" />
                                : <CheckCircle className="w-3.5 h-3.5" />
                              }
                              Approuver
                            </button>
                            <button
                              onClick={() => handleAction(request.id, 'rejected')}
                              disabled={!!actionLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {isLoadingReject
                                ? <span className="w-3.5 h-3.5 border border-red-400/40 border-t-red-400 rounded-full animate-spin inline-block" />
                                : <XCircle className="w-3.5 h-3.5" />
                              }
                              Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}