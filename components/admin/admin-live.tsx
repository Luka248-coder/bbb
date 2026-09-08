'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Users, MapPin, X, Play, Globe } from 'lucide-react'

interface Visitor {
  id: string
  ip: string
  city: string
  country: string
  region: string
  username: string
  page: string
  watching: boolean
  content_type: 'movie' | 'series' | null
  title: string | null
  poster: string | null
  season: number | null
  episode: number | null
  last_seen: string
}

function pageLabel(page: string) {
  if (page === 'watch_movie') return 'Lecture film'
  if (page === 'watch_series') return 'Lecture série'
  if (page === 'admin') return 'Admin'
  return 'Navigation'
}

function loc(v: Visitor) {
  return [v.city, v.region, v.country].filter(Boolean).join(', ') || '—'
}

export function AdminLivePresence() {
  const [open, setOpen] = useState(false)
  const [total, setTotal] = useState(0)
  const [watching, setWatching] = useState(0)
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [playbacks, setPlaybacks] = useState<Visitor[]>([])

  const load = () => {
    fetch('/api/auth/admin/live')
      .then(r => r.json())
      .then(d => {
        setTotal(d.total || 0)
        setWatching(d.watching || 0)
        setVisitors(d.visitors || [])
        setPlaybacks(d.playbacks || [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 12000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/25">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold">En ligne maintenant</p>
            <p className="text-3xl font-black text-white tabular-nums leading-tight">{total}</p>
            <p className="text-xs text-white/35 mt-0.5">
              {watching > 0 ? `${watching} lecture${watching > 1 ? 's' : ''} en cours` : 'Aucune lecture en cours'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setOpen(true); load() }}
          className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors self-start sm:self-auto"
        >
          Détail
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-950 p-5 md:p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-black text-white">Activité en direct</h2>
                  <p className="text-sm text-white/35">{total} personne{total > 1 ? 's' : ''} · {watching} lecture{watching > 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {playbacks.length > 0 && (
                <div className="mb-6">
                  <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold mb-3 flex items-center gap-2">
                    <Play className="w-3.5 h-3.5" /> Lectures en cours
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {playbacks.map(p => (
                      <div key={p.id} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                        <div className="relative w-12 h-[72px] rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                          {p.poster ? (
                            <Image src={p.poster} alt="" fill className="object-cover" sizes="48px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-4 h-4 text-white/20" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-semibold line-clamp-2">{p.title}</p>
                          <p className="text-white/40 text-xs mt-1">
                            {p.content_type === 'series' && p.season
                              ? `S${String(p.season).padStart(2, '0')}E${String(p.episode || 1).padStart(2, '0')}`
                              : p.content_type === 'movie' ? 'Film' : 'Lecture'}
                            {' · '}{p.username}
                          </p>
                          <p className="text-white/25 text-[11px] mt-1 truncate">{loc(p)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Personnes sur le site
              </p>
              {visitors.length === 0 ? (
                <p className="text-white/30 text-sm py-8 text-center">Personne en ligne pour le moment.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-white/30 bg-white/[0.03]">
                      <tr>
                        <th className="px-3 py-2 font-medium">Personne</th>
                        <th className="px-3 py-2 font-medium">IP</th>
                        <th className="px-3 py-2 font-medium">Localisation</th>
                        <th className="px-3 py-2 font-medium">Activité</th>
                        <th className="px-3 py-2 font-medium">Lecture</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitors.map(v => (
                        <tr key={v.id} className="border-t border-white/[0.05]">
                          <td className="px-3 py-2.5 text-white font-medium">{v.username}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-white/50">{v.ip}</td>
                          <td className="px-3 py-2.5 text-white/50">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-white/25" />
                              {loc(v)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-white/40">{pageLabel(v.page)}</td>
                          <td className="px-3 py-2.5 text-white/70">
                            {v.title ? (
                              <span>
                                {v.title}
                                {v.content_type === 'series' && v.season
                                  ? ` · S${v.season}E${v.episode || 1}`
                                  : ''}
                              </span>
                            ) : (
                              <span className="text-white/25">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
