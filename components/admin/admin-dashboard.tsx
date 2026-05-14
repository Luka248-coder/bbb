'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Film, Tv, Users, MessageSquare, CheckCircle, XCircle,
  Clock, Headphones, Ban, TrendingUp, ChevronRight,
  Activity, Star, ShieldAlert,
} from 'lucide-react'
import type { ContentRequest } from '@/lib/types'

/* ─── Types ─────────────────────────────────────────────────── */
interface Stats {
  movies: number; series: number; users: number; requests: number
  pendingRequests: number; approvedRequests: number; rejectedRequests: number
  openTickets: number; closedTickets: number; bannedUsers: number
}
interface AdminDashboardProps {
  stats: Stats
  recentRequests: ContentRequest[]
  recentUsers: any[]
  recentTickets: any[]
  requestsByDay: any[]
  usersByDay: any[]
}

/* ─── Mini Sparkline (SVG pur, pas de lib) ───────────────────── */
function Sparkline({ data, color = '#ef4444', height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const w = 120; const h = height
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#g${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Mini Bar Chart ─────────────────────────────────────────── */
function BarChart({ data, color = '#ef4444' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1 h-16 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className="w-full rounded-sm transition-all"
            style={{ height: `${Math.max((d.value / max) * 56, 2)}px`, backgroundColor: color, opacity: d.value ? 0.7 : 0.15 }}
          />
          <span className="text-[8px] text-white/20 group-hover:text-white/50 transition-colors">{d.label}</span>
          {/* Tooltip */}
          {d.value > 0 && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {d.value}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Donut Chart (SVG) ──────────────────────────────────────── */
function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1
  const r = 30; const cx = 40; const cy = 40
  let angle = -90
  const arcs = segments.map(s => {
    const pct = s.value / total
    const a1 = (angle * Math.PI) / 180
    angle += pct * 360
    const a2 = (angle * Math.PI) / 180
    const x1 = cx + r * Math.cos(a1); const y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2); const y2 = cy + r * Math.sin(a2)
    const large = pct > 0.5 ? 1 : 0
    return { ...s, d: pct > 0.001 ? `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z` : '' }
  })
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 80 80" className="w-16 h-16 flex-shrink-0">
        {arcs.map((a, i) => a.d && <path key={i} d={a.d} fill={a.color} opacity="0.85" />)}
        <circle cx={cx} cy={cy} r="18" fill="#18080c" />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="bold">
          {total}
        </text>
      </svg>
      <div className="space-y-1">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-white/50">{s.label}</span>
            <span className="text-white font-semibold ml-auto pl-3">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Dashboard ─────────────────────────────────────────── */
export function AdminDashboard({ stats, recentRequests, recentUsers, recentTickets, requestsByDay, usersByDay }: AdminDashboardProps) {

  // Build last-14-days buckets for requests
  const reqChartData = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.getDate().toString()
      const value = requestsByDay.filter(r => r.created_at?.slice(0, 10) === key).length
      days.push({ label, value })
    }
    return days
  }, [requestsByDay])

  const userChartData = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.getDate().toString()
      const value = usersByDay.filter(r => r.created_at?.slice(0, 10) === key).length
      days.push({ label, value })
    }
    return days
  }, [usersByDay])

  const sparklineReq = reqChartData.map(d => d.value)
  const sparklineUsers = userChartData.map(d => d.value)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const handleRequestAction = async (id: string, status: 'approved' | 'rejected') => {
    await fetch('/api/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    window.location.reload()
  }

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4 },
  })

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-screen">

      {/* ── Header ── */}
      <motion.div {...fade(0)} className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-white/40 text-sm mb-0.5">{greeting} 👋</p>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-white/30 text-sm mt-1">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {stats.pendingRequests > 0 && (
          <Link href="/admin/requests">
            <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/25 rounded-xl px-4 py-2.5 text-amber-400 text-sm font-semibold hover:bg-amber-400/15 transition-colors cursor-pointer">
              <Clock className="w-4 h-4" />
              {stats.pendingRequests} demande{stats.pendingRequests > 1 ? 's' : ''} en attente
            </div>
          </Link>
        )}
      </motion.div>

      {/* ── KPI Grid ── */}
      <motion.div {...fade(0.05)} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Films en ligne',   value: stats.movies,  icon: Film,    color: '#3b82f6', spark: [] },
          { label: 'Séries en ligne',  value: stats.series,  icon: Tv,      color: '#8b5cf6', spark: [] },
          { label: 'Utilisateurs',     value: stats.users,   icon: Users,   color: '#10b981', spark: sparklineUsers },
          { label: 'Demandes totales', value: stats.requests, icon: MessageSquare, color: '#ef4444', spark: sparklineReq },
        ].map(({ label, value, icon: Icon, color, spark }, i) => (
          <motion.div key={label} {...fade(0.05 + i * 0.04)}
            className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 overflow-hidden relative group hover:border-white/15 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white/40 text-xs font-medium mb-1">{label}</p>
                <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22', border: `1px solid ${color}33` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            {spark.length > 0 && (
              <div className="opacity-60 group-hover:opacity-100 transition-opacity -mx-1">
                <Sparkline data={spark} color={color} height={32} />
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Demandes 14j */}
        <motion.div {...fade(0.1)} className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold">Demandes de contenu</p>
              <p className="text-white/30 text-xs">14 derniers jours</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-lg">
              <Activity className="w-3 h-3" />
              {requestsByDay.length} ce mois
            </div>
          </div>
          <BarChart data={reqChartData} color="#ef4444" />
        </motion.div>

        {/* Répartition demandes */}
        <motion.div {...fade(0.12)} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <p className="text-white font-semibold mb-1">Répartition</p>
          <p className="text-white/30 text-xs mb-4">Statuts des demandes</p>
          <DonutChart segments={[
            { value: stats.pendingRequests,  color: '#f59e0b', label: 'En attente' },
            { value: stats.approvedRequests, color: '#10b981', label: 'Approuvées' },
            { value: stats.rejectedRequests, color: '#ef4444', label: 'Refusées' },
          ]} />
        </motion.div>
      </div>

      {/* ── Secondary stats ── */}
      <motion.div {...fade(0.14)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tickets ouverts',  value: stats.openTickets,   icon: Headphones,  color: '#f59e0b' },
          { label: 'Tickets résolus',  value: stats.closedTickets, icon: CheckCircle, color: '#10b981' },
          { label: 'Users bannis',     value: stats.bannedUsers,   icon: ShieldAlert, color: '#ef4444' },
          { label: 'Inscriptions / mois', value: usersByDay.length, icon: TrendingUp, color: '#8b5cf6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex items-center gap-3 hover:border-white/15 transition-all">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20', border: `1px solid ${color}30` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-white/35 text-xs">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Demandes en attente */}
        <motion.div {...fade(0.16)} className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
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
            <Link href="/admin/requests" className="text-xs text-white/30 hover:text-white flex items-center gap-1 transition-colors">
              Voir tout <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-8 h-8 text-white/15 mb-2" />
              <p className="text-white/30 text-sm">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {recentRequests.map((req, i) => {
                const avatarUrl = req.user?.avatar
                  ? `https://cdn.discordapp.com/avatars/${req.user_id}/${req.user.avatar}.png`
                  : null
                const posterUrl = (req as any).poster
                  ? `https://image.tmdb.org/t/p/w92${(req as any).poster}`
                  : null
                return (
                  <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Poster */}
                    <div className="w-8 h-11 rounded-lg overflow-hidden bg-white/5 border border-white/10 relative flex-shrink-0">
                      {posterUrl
                        ? <Image src={posterUrl} alt={req.title} fill sizes="32px" className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            {req.content_type === 'movie' ? <Film className="w-3 h-3 text-white/20" /> : <Tv className="w-3 h-3 text-white/20" />}
                          </div>
                      }
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{req.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-white/30">
                        {avatarUrl
                          ? <Image src={avatarUrl} alt="" width={12} height={12} className="rounded-full" />
                          : <Users className="w-3 h-3" />
                        }
                        <span>{req.user?.username || 'Inconnu'}</span>
                        <span>•</span>
                        <span>{new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                    {/* Actions */}
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
        </motion.div>

        {/* Right column */}
        <div className="space-y-3">

          {/* Tickets support */}
          <motion.div {...fade(0.18)} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-white text-sm">Tickets support</span>
              </div>
              <Link href="/admin/support" className="text-xs text-white/30 hover:text-white flex items-center gap-1 transition-colors">
                Voir tout <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {recentTickets.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-white/25 text-sm">Aucun ticket</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {recentTickets.slice(0, 4).map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ticket.status === 'open' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{ticket.subject || 'Sans titre'}</p>
                      <p className="text-white/30 text-[10px]">{ticket.users?.username || 'Inconnu'}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                      ticket.status === 'open'
                        ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                        : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                    }`}>
                      {ticket.status === 'open' ? 'Ouvert' : 'Fermé'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Derniers inscrits */}
          <motion.div {...fade(0.2)} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-white text-sm">Nouveaux membres</span>
              </div>
              <Link href="/admin/users" className="text-xs text-white/30 hover:text-white flex items-center gap-1 transition-colors">
                Voir tout <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {recentUsers.slice(0, 5).map((u: any) => {
                const avatarUrl = u.avatar
                  ? `https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png`
                  : null
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/20 border border-primary/20 flex-shrink-0 relative">
                      {avatarUrl
                        ? <Image src={avatarUrl} alt={u.username} fill sizes="28px" className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-primary text-xs font-bold">{u.username?.[0]?.toUpperCase()}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{u.username}</p>
                      <p className="text-white/30 text-[10px]">{new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    {u.is_admin && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/20">ADMIN</span>
                    )}
                    {u.is_banned && (
                      <Ban className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}