'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, Key, Globe, Loader2, CheckCircle, WrenchIcon, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    fastflux_api_key: '',
    tmdb_api_key: '',
    discord_client_id: '',
    discord_client_secret: '',
    site_name: '',
    site_description: '',
    maintenance_mode: 'false',
    maintenance_message: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/auth/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings((prev) => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/auth/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const isMaintenanceOn = settings.maintenance_mode === 'true'

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          Paramètres
        </h1>
        <p className="text-muted-foreground">Configurez les paramètres de votre plateforme</p>
      </motion.div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-lg shimmer" />
          ))}
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl">

          {/* ── Maintenance Mode ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={isMaintenanceOn ? 'border-orange-500/60 bg-orange-950/10' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <WrenchIcon className={`w-5 h-5 ${isMaintenanceOn ? 'text-orange-400' : 'text-primary'}`} />
                  Mode maintenance
                </CardTitle>
                <CardDescription>
                  Quand activé, tout le site est inaccessible aux visiteurs. Les admins peuvent toujours y accéder.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    {isMaintenanceOn && <AlertTriangle className="w-5 h-5 text-orange-400 animate-pulse" />}
                    <div>
                      <p className="font-semibold text-sm">{isMaintenanceOn ? 'Maintenance activée' : 'Site en ligne'}</p>
                      <p className="text-xs text-muted-foreground">
                        {isMaintenanceOn
                          ? 'Le site est inaccessible aux utilisateurs'
                          : 'Le site est accessible normalement'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('maintenance_mode', isMaintenanceOn ? 'false' : 'true')}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                      isMaintenanceOn ? 'bg-orange-500' : 'bg-muted border border-border'
                    }`}
                    role="switch"
                    aria-checked={isMaintenanceOn}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                        isMaintenanceOn ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="maintenance_message">Message affiché aux visiteurs</Label>
                  <Textarea
                    id="maintenance_message"
                    value={settings.maintenance_message}
                    onChange={(e) => handleChange('maintenance_message', e.target.value)}
                    placeholder="Nous effectuons une maintenance pour améliorer votre expérience. Revenez très bientôt !"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Laissez vide pour utiliser le message par défaut</p>
                </div>

                {isMaintenanceOn && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-950/30 border border-orange-800/50 text-orange-300 text-xs">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      Le mode maintenance est <strong>actif</strong>. Les visiteurs non-admins voient la page de maintenance.{' '}
                      <strong>N&apos;oubliez pas de sauvegarder !</strong>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Site Settings ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Paramètres du site
                </CardTitle>
                <CardDescription>Informations générales sur votre plateforme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site_name">Nom du site</Label>
                  <Input
                    id="site_name"
                    value={settings.site_name}
                    onChange={(e) => handleChange('site_name', e.target.value)}
                    placeholder="Streamself"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site_description">Description</Label>
                  <Textarea
                    id="site_description"
                    value={settings.site_description}
                    onChange={(e) => handleChange('site_description', e.target.value)}
                    placeholder="Votre plateforme de streaming"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── API Settings ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Configuration API
                </CardTitle>
                <CardDescription>Clés API et paramètres de connexion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fastflux_api_key">Clé API FastFlux</Label>
                  <Input
                    id="fastflux_api_key"
                    type="password"
                    value={settings.fastflux_api_key}
                    onChange={(e) => handleChange('fastflux_api_key', e.target.value)}
                    placeholder="ff_xxxxxxxx..."
                  />
                  <p className="text-xs text-muted-foreground">Clé API pour accéder au catalogue de films et séries</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tmdb_api_key">Clé API TMDB</Label>
                  <Input
                    id="tmdb_api_key"
                    type="password"
                    value={settings.tmdb_api_key}
                    onChange={(e) => handleChange('tmdb_api_key', e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground">Clé API pour les métadonnées (posters, descriptions, acteurs...)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discord_client_id">Discord Client ID</Label>
                  <Input
                    id="discord_client_id"
                    value={settings.discord_client_id}
                    onChange={(e) => handleChange('discord_client_id', e.target.value)}
                    placeholder="123456789..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discord_client_secret">Discord Client Secret</Label>
                  <Input
                    id="discord_client_secret"
                    type="password"
                    value={settings.discord_client_secret}
                    onChange={(e) => handleChange('discord_client_secret', e.target.value)}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-muted-foreground">Secret pour l&apos;authentification OAuth2 Discord</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Discord Callback ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">URL de callback Discord</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="block p-3 bg-background rounded-lg text-sm break-all">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/api/auth/discord/callback`
                    : 'https://votre-domaine.vercel.app/api/auth/discord/callback'}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Ajoutez cette URL dans les paramètres OAuth2 de votre application Discord
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Save ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer les modifications'}
            </Button>
          </motion.div>

        </div>
      )}
    </div>
  )
}