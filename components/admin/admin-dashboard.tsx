'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Film, Tv, Users, MessageSquare, CheckCircle, XCircle,
  Clock, Headphones, Ban, ChevronRight, Star,
  AlertTriangle, RefreshCw, TrendingUp, Play, Library,
  Bell, Zap, ImageIcon,
} from 'lucide-react'
import type { ContentRequest } from '@/lib/types'

interface Stats {
  movies: number; series: number; users: number; requests: number
  pendingRequests: number; approvedRequests: number; rejectedRequests: number
  openTickets: number; closedTickets: number; bannedUsers: number
}
interface PlayerError {
  id: number; tmdb_id: number | null; content_type: string
  title: string; season: number | null; episode: number | null; created_at: string
}
interface AdminDashboardProps {
  stats: Stats
  recentRequests: ContentRequest[]
  recentUsers: any[]
  recentTickets: any[]
  requestsByDay: any[]
  usersByDay: any[]
  playerErrors: PlayerError[]
}

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] as any },
})

function MiniBarChart({ data, color = '#e50914' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-0.5 h-10 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all group relative" style={{
          height: `${Math.max((d.value / max) * 100, 4)}%`,
          background: d.value ? color : 'rgba(255,255,255,0.05)',
          opacity: d.value ? 0.6 + (i / data.length) * 0.4 : 1,
        }} />
      ))}
    </div>
  )
}

export function AdminDashboard({ stats, recentRequests, recentUsers, recentTickets, requestsByDay, usersByDay, playerErrors }: AdminDashboardProps) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const reqChartData = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ label: d.getDate().toString(), value: requestsByDay.filter(r => r.created_at?.slice(0, 10) === key).length })
    }
    return days
  }, [requestsByDay])

  const userChartData = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ label: d.getDate().toString(), value: usersByDay.filter(r => r.created_at?.slice(0, 10) === key).length })
    }
    return days
  }, [usersByDay])

  const handleRequestAction = async (id: string, status: 'approved' | 'rejected') => {
    await fetch('/api/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    window.location.reload()
  }

  const quickLinks = [
    { href: '/admin/movies', icon: Film, label: 'Gérer les films', color: '#3b82f6' },
    { href: '/admin/series', icon: Tv, label: 'Gérer les séries', color: '#8b5cf6' },
    { href: '/admin/api-catalogue', icon: Zap, label: 'API Catalogue', color: '#f59e0b' },
    { href: '/admin/hero', icon: ImageIcon, label: 'Hero / Mise en avant', color: '#e50914' },
    { href: '/admin/notifications', icon: Bell, label: 'Notifications', color: '#10b981' },
    { href: '/admin/support', icon: Headphones, label: 'Support', color: '#06b6d4' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* Header */}
        <motion.div {...fade(0)}>
          <p className="text-xs font-semibold tracking-widest text-primary/60 uppercase mb-1">Panel de contrôle</p>
          <h1 className="text-2xl md:text-3xl font-black text-white">{greeting} 👋</h1>
          <p className="text-white/30 text-sm mt-1">Voici un aperçu de votre plateforme aujourd'hui.</p>
        </motion.div>

        {/* KPI row */}
        <motion.div {...fade(0.04)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Films', value: stats.movies, icon: Film, color: '#3b82f6', href: '/admin/movies', sub: 'Au catalogue' },
            { label: 'Séries', value: stats.series, icon: Tv, color: '#8b5cf6', href: '/admin/series', sub: 'Au catalogue' },
            { label: 'Membres', value: stats.users, icon: Users, color: '#10b981', href: '/admin/users', sub: 'Inscrits' },
            { label: 'Tickets ouverts', value: stats.openTickets, icon: Headphones, color: '#f59e0b', href: '/admin/support', sub: 'Support actif' },
          ].map((kpi) => (
            <Link key={kpi.label} href={kpi.href}>
              <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] transition-all p-4 cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: kpi.color + '22', border: `1px solid ${kpi.color}33` }}>
                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors mt-0.5" />
                </div>
                <div className="text-3xl font-black text-white tabular-nums">{kpi.value.toLocaleString()}</div>
                <div className="mt-0.5 text-xs text-white/30">{kpi.sub}</div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-5" style={{ background: kpi.color }} />
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Hero / mise en avant + accès rapides */}
        <motion.div {...fade(0.08)} className="grid md:grid-cols-3 gap-4">

          {/* Hero mise en avant CTA */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary/80 uppercase tracking-widest">Hero / Mise en avant</span>
              </div>
              <h2 className="text-xl font-black text-white leading-tight">Configurez votre bandeau principal</h2>
              <p className="text-white/40 text-sm mt-1">Choisissez les contenus mis en avant sur la page d'accueil.</p>
            </div>
            <Link href="/admin/hero">
              <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors w-fit">
                <Play className="w-3.5 h-3.5" />
                Modifier le hero
              </div>
            </Link>
            <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
            <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          </div>

          {/* Accès rapides */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="text-[10px] font-semibold tracking-widest text-white/25 uppercase mb-3">Accès rapides</p>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map(ql => (
                <Link key={ql.href} href={ql.href}>
                  <div className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] transition-all cursor-pointer group">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: ql.color + '22' }}>
                      <ql.icon className="w-3.5 h-3.5" style={{ color: ql.color }} />
                    </div>
                    <span className="text-[11px] text-white/50 group-hover:text-white/80 transition-colors leading-tight font-medium">{ql.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Charts row */}
        <motion.div {...fade(0.1)} className="grid md:grid-cols-2 gap-4">
          {[
            { title: 'Demandes (14j)', data: reqChartData, color: '#e50914', badge: stats.pendingRequests, badgeLabel: 'en attente', href: '/admin/requests' },
            { title: 'Nouveaux membres (14j)', data: userChartData, color: '#8b5cf6', badge: null, badgeLabel: '', href: '/admin/users' },
          ].map(chart => (
            <div key={chart.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: chart.color }} />
                  <span className="font-semibold text-white text-sm">{chart.title}</span>
                  {chart.badge !== null && chart.badge > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: chart.color + '22', color: chart.color }}>
                      {chart.badge} {chart.badgeLabel}
                    </span>
                  )}
                </div>
                <Link href={chart.href} className="text-[11px] text-white/20 hover:text-white/60 transition-colors">Voir tout →</Link>
              </div>
              <MiniBarChart data={chart.data} color={chart.color} />
            </div>
          ))}
        </motion.div>

        {/* Main content: requests + right panel */}
        <motion.div {...fade(0.12)} className="grid lg:grid-cols-3 gap-4">

          {/* Demandes en attente */}
          <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-white text-sm">Demandes en attente</span>
                {stats.pendingRequests > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                    {stats.pendingRequests}
                  </span>
                )}
              </div>
              <Link href="/admin/requests" className="text-xs text-white/25 hover:text-white/70 flex items-center gap-1 transition-colors">
                Voir tout <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {recentRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <MessageSquare className="w-8 h-8 text-white/10 mb-2" />
                <p className="text-white/20 text-sm">Aucune demande en attente</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {recentRequests.map((req, i) => {
                  const avatarUrl = req.user?.avatar ? `https://cdn.discordapp.com/avatars/${req.user_id}/${req.user.avatar}.png` : null
                  const posterUrl = (req as any).poster ? `https://image.tmdb.org/t/p/w92${(req as any).poster}` : null
                  return (
                    <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="w-8 h-11 rounded-lg overflow-hidden bg-white/5 border border-white/10 relative flex-shrink-0">
                        {posterUrl
                          ? <Image src={posterUrl} alt={req.title} fill sizes="32px" className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              {req.content_type === 'movie' ? <Film className="w-3 h-3 text-white/20" /> : <Tv className="w-3 h-3 text-white/20" />}
                            </div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{req.title}</p>
                        <div className="flex items-center gap-1 text-xs text-white/25">
                          {avatarUrl ? <Image src={avatarUrl} alt="" width={10} height={10} className="rounded-full" /> : <Users className="w-2.5 h-2.5" />}
                          <span className="truncate max-w-[80px]">{req.user?.username || 'Inconnu'}</span>
                          <span>·</span>
                          <span>{new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleRequestAction(req.id, 'approved')}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-all">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleRequestAction(req.id, 'rejected')}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Support tickets */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white text-sm">Support</span>
                  {stats.openTickets > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20">
                      {stats.openTickets}
                    </span>
                  )}
                </div>
                <Link href="/admin/support" className="text-xs text-white/25 hover:text-white/70 flex items-center gap-1 transition-colors">
                  Voir tout <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {recentTickets.length === 0 ? (
                <div className="py-8 text-center"><p className="text-white/20 text-xs">Aucun ticket ouvert</p></div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {recentTickets.slice(0, 4).map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ticket.status === 'open' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{ticket.subject || 'Sans titre'}</p>
                        <p className="text-white/25 text-[10px]">{ticket.users?.username || 'Inconnu'}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                        ticket.status === 'open' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                      }`}>
                        {ticket.status === 'open' ? 'Ouvert' : 'Fermé'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nouveaux membres */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-white text-sm">Nouveaux membres</span>
                </div>
                <Link href="/admin/users" className="text-xs text-white/25 hover:text-white/70 flex items-center gap-1 transition-colors">
                  Voir tout <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {recentUsers.slice(0, 5).map((u: any) => {
                  const avatarUrl = u.avatar ? `https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png` : null
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/10 border border-primary/15 flex-shrink-0 relative">
                        {avatarUrl
                          ? <Image src={avatarUrl} alt={u.username} fill sizes="28px" className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-primary text-xs font-bold">{u.username?.[0]?.toUpperCase()}</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{u.username}</p>
                        <p className="text-white/25 text-[10px]">{new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      {u.is_admin && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20 flex-shrink-0">ADMIN</span>}
                      {u.is_banned && <Ban className="w-3 h-3 text-red-400 flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Erreurs de lecture */}
            {playerErrors.length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-red-500/15 bg-red-500/[0.04]">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-red-500/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="font-semibold text-white text-sm">Erreurs de lecture</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">{playerErrors.length}</span>
                  </div>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {playerErrors.slice(0, 5).map((err) => (
                    <div key={err.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.07] flex-shrink-0">
                        {err.content_type === 'movie' ? <Film className="w-3 h-3 text-white/30" /> : <Tv className="w-3 h-3 text-white/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{err.title}</p>
                        <p className="text-white/25 text-[10px]">{err.content_type === 'series' && err.season != null ? `S${err.season}·E${err.episode}` : 'Film'}</p>
                      </div>
                      <p className="text-white/20 text-[10px] flex-shrink-0">{new Date(err.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </motion.div>

      </div>
    </div>
  )
}
