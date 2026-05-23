'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Play, Trash2, RefreshCw, Film, Tv, AlertTriangle,
  CheckCircle2, XCircle, Loader2, Info, BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Stats {
  movies: { total: number; withUrl: number; fastflux: number }
  episodes: { total: number; withUrl: number; fastflux: number }
}

interface ImportResult {
  movies: { updated: number; skipped: number; errors: number }
  series: { updated: number; skipped: number; errors: number }
  episodes: { updated: number; skipped: number; errors: number }
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function AdminApiPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsStatus, setStatsStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [importStatus, setImportStatus] = useState<Status>('idle')
  const [deleteStatus, setDeleteStatus] = useState<Status>('idle')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchStats = useCallback(async () => {
    setStatsStatus('loading')
    try {
      const res = await fetch('/api/auth/admin/fastflux')
      if (!res.ok) throw new Error()
      setStats(await res.json())
      setStatsStatus('ok')
    } catch {
      setStatsStatus('error')
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const handleImport = async () => {
    setImportStatus('loading')
    setImportResult(null)
    setErrorMsg('')
    try {
      const res = await fetch('/api/auth/admin/fastflux', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')
      setImportResult(data.results)
      setImportStatus('success')
      fetchStats()
    } catch (e: any) {
      setErrorMsg(e.message)
      setImportStatus('error')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleteStatus('loading')
    setConfirmDelete(false)
    try {
      const res = await fetch('/api/auth/admin/fastflux', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDeleteStatus('success')
      fetchStats()
      setTimeout(() => setDeleteStatus('idle'), 3000)
    } catch {
      setDeleteStatus('error')
      setTimeout(() => setDeleteStatus('idle'), 3000)
    }
  }

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary" />
          Intégration FastFlux
        </h1>
        <p className="text-muted-foreground mt-1">
          Importez automatiquement les liens vidéo depuis l'API FastFlux pour vos films et séries
        </p>
      </motion.div>

      <div className="space-y-6 max-w-3xl">

        {/* ── Statistiques ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-primary" />
                Statistiques de couverture
              </CardTitle>
              <CardDescription>Films et épisodes couverts par FastFlux dans votre catalogue</CardDescription>
            </CardHeader>
            <CardContent>
              {statsStatus === 'loading' ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
                </div>
              ) : statsStatus === 'error' ? (
                <p className="text-destructive text-sm">Impossible de charger les stats.</p>
              ) : stats ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* Films */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Film className="w-4 h-4 text-primary" /> Films
                    </div>
                    <StatRow label="Total catalogue" value={stats.movies.total} />
                    <StatRow label="Avec un lien vidéo" value={stats.movies.withUrl} total={stats.movies.total} />
                    <StatRow label="Liens FastFlux" value={stats.movies.fastflux} highlight />
                  </div>
                  {/* Épisodes */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Tv className="w-4 h-4 text-primary" /> Épisodes
                    </div>
                    <StatRow label="Total catalogue" value={stats.episodes.total} />
                    <StatRow label="Avec un lien vidéo" value={stats.episodes.withUrl} total={stats.episodes.total} />
                    <StatRow label="Liens FastFlux" value={stats.episodes.fastflux} highlight />
                  </div>
                </div>
              ) : null}
              <button
                onClick={fetchStats}
                className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Actualiser
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Infos ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-5">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1.5">
                  <p>
                    <span className="text-foreground font-medium">Comment ça marche :</span> FastFlux est comparé à votre catalogue par TMDB ID.
                    Seuls les films et épisodes <strong>déjà présents</strong> dans votre base et <strong>sans lien vidéo</strong> seront mis à jour.
                  </p>
                  <p>
                    Chaque lien MP4 est automatiquement préfixé par{' '}
                    <code className="text-xs bg-background px-1.5 py-0.5 rounded">https://atstream.online/api/stream?url=</code>{' '}
                    pour assurer la compatibilité de lecture.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Import ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="w-5 h-5 text-green-500" />
                Importer les liens FastFlux
              </CardTitle>
              <CardDescription>
                Lance la synchronisation : pour chaque contenu sans lien, FastFlux est interrogé et le MP4 extrait.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleImport}
                disabled={importStatus === 'loading'}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                {importStatus === 'loading' ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Importation en cours...</>
                ) : importStatus === 'success' ? (
                  <><CheckCircle2 className="w-5 h-5 mr-2" /> Importation terminée</>
                ) : (
                  <><Zap className="w-5 h-5 mr-2" /> Démarrer l'importation</>
                )}
              </Button>

              {importStatus === 'loading' && (
                <p className="text-xs text-muted-foreground text-center">
                  Cette opération peut prendre plusieurs minutes selon la taille de votre catalogue…
                </p>
              )}

              <AnimatePresence>
                {importStatus === 'success' && importResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-green-500/30 bg-green-950/20 p-4 space-y-3"
                  >
                    <p className="text-green-400 font-semibold text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Résultats de l'importation
                    </p>
                    <ResultTable label="Films" data={importResult.movies} />
                    <ResultTable label="Séries" data={importResult.series} />
                    <ResultTable label="Épisodes" data={importResult.episodes} />
                  </motion.div>
                )}

                {importStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-destructive/30 bg-destructive/10 p-4"
                  >
                    <p className="text-destructive text-sm flex items-center gap-2">
                      <XCircle className="w-4 h-4" /> Erreur : {errorMsg || 'Une erreur est survenue'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Suppression ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <Trash2 className="w-5 h-5" />
                Supprimer tous les liens FastFlux
              </CardTitle>
              <CardDescription>
                Retire tous les liens vidéo ajoutés par FastFlux (films et épisodes). Les contenus sans lien restent dans le catalogue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence mode="wait">
                {confirmDelete ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-orange-500/40 bg-orange-950/20 p-4 space-y-3"
                  >
                    <div className="flex items-start gap-2 text-orange-300 text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Êtes-vous sûr ? Cette action supprimera <strong>tous</strong> les liens FastFlux de votre catalogue.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteStatus === 'loading'}
                        className="flex-1"
                      >
                        {deleteStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Oui, supprimer
                      </Button>
                      <Button variant="outline" onClick={() => setConfirmDelete(false)} className="flex-1">
                        Annuler
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button
                      variant="outline"
                      onClick={handleDelete}
                      disabled={deleteStatus === 'loading'}
                      className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      size="lg"
                    >
                      {deleteStatus === 'loading' ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Suppression...</>
                      ) : deleteStatus === 'success' ? (
                        <><CheckCircle2 className="w-5 h-5 mr-2" /> Liens supprimés</>
                      ) : deleteStatus === 'error' ? (
                        <><XCircle className="w-5 h-5 mr-2" /> Erreur lors de la suppression</>
                      ) : (
                        <><Trash2 className="w-5 h-5 mr-2" /> Supprimer tous les liens FastFlux</>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  )
}

// ── Helpers ──

function StatRow({ label, value, total, highlight }: { label: string; value: number; total?: number; highlight?: boolean }) {
  const pct = total ? Math.round((value / total) * 100) : null
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'text-primary font-semibold' : 'font-medium'}>
        {value.toLocaleString('fr-FR')}
        {pct !== null && <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>}
      </span>
    </div>
  )
}

function ResultTable({ label, data }: { label: string; data: { updated: number; skipped: number; errors: number } }) {
  return (
    <div className="text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center p-2 rounded-lg bg-green-900/30 text-green-400">
          <p className="font-bold text-lg">{data.updated}</p>
          <p>mis à jour</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30 text-muted-foreground">
          <p className="font-bold text-lg">{data.skipped}</p>
          <p>ignorés</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-900/20 text-red-400">
          <p className="font-bold text-lg">{data.errors}</p>
          <p>erreurs</p>
        </div>
      </div>
    </div>
  )
}
