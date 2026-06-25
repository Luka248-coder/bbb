'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check, Search, User, Lock, Loader2, Edit2, Upload, Link as LinkIcon, FloppyDisk } from 'lucide-react'
import Image from 'next/image'
import { useProfile, Profile } from '@/contexts/ProfileContext'

type Tab = 'general' | 'avatar'

export default function ProfilesPage() {
  const router = useRouter()
  const { setActiveProfile, profiles, loadProfiles } = useProfile()

  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editProfile, setEditProfile] = useState<Profile | null>(null)
  const [pinPrompt, setPinPrompt] = useState<Profile | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)

  const [tab, setTab] = useState<Tab>('general')
  const [formName, setFormName] = useState('Nouveau Profil')
  const [formPin, setFormPin] = useState('')
  const [formAvatar, setFormAvatar] = useState<string | null>(null)
  const [avatars, setAvatars] = useState<any[]>([])
  const [avatarSearch, setAvatarSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [discordId, setDiscordId] = useState('')
  const [discordLoading, setDiscordLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfiles().then(() => setLoading(false))
    fetch('/api/profile-avatars').then(r => r.json()).then(setAvatars).catch(() => {})
  }, [])

  const openCreate = () => {
    setFormName(''); setFormPin(''); setFormAvatar(null)
    setTab('general'); setEditProfile(null); setShowCreate(true)
  }
  const openEdit = (p: Profile) => {
    setFormName(p.name); setFormPin(p.pin || ''); setFormAvatar(p.avatar_url)
setTab('general'); setEditProfile(p); setShowCreate(true)
  }

  const [formError, setFormError] = useState<string | null>(null)

  const saveProfile = async () => {
    setFormError(null)
    if (!formName.trim()) {
      setFormError('Le nom du profil est obligatoire.')
      setTab('general')
      return
    }
    if (!formAvatar) {
      setFormError('Veuillez choisir un avatar.')
      setTab('avatar')
      return
    }
    setSaving(true)
    const body = { name: formName, pin: formPin || null, avatar_url: formAvatar }
    try {
      const method = editProfile ? 'PATCH' : 'POST'
      const bodyFull = editProfile ? { id: editProfile.id, ...body } : body
      const res = await fetch('/api/profiles', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyFull) })
      if (res.ok) { await loadProfiles(); setShowCreate(false) }
    } catch {}
    setSaving(false)
  }

  const deleteProfile = async (id: string) => {
    if (!confirm('Supprimer ce profil ?')) return
    await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' })
    await loadProfiles()
  }

  const selectProfile = (p: Profile) => {
    if (p.pin) { setPinPrompt(p); setPinInput(''); setPinError(false) }
    else { setActiveProfile(p); router.push('/') }
  }

  const syncDiscord = async () => {
    if (!discordId.trim()) return
    setDiscordLoading(true)
    try {
      const res = await fetch(`/api/discord-avatar?id=${discordId.trim()}`)
      const data = await res.json()
      if (res.ok && data.url) {
        setFormAvatar(data.url)
        if (data.username && (formName === 'Nouveau Profil' || !formName)) setFormName(data.username)
      } else {
        alert(data.error || 'Erreur Discord')
      }
    } catch { alert('Erreur de connexion') }
    setDiscordLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: fd })
      if (res.ok) { const { url } = await res.json(); setFormAvatar(url) }
      else {
        const reader = new FileReader()
        reader.onload = ev => setFormAvatar(ev.target?.result as string)
        reader.readAsDataURL(file)
      }
    } catch {
      const reader = new FileReader()
      reader.onload = ev => setFormAvatar(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
    setUploadLoading(false)
    if (e.target) e.target.value = ''
  }

  const filteredAvatars = avatars.filter(a =>
    !avatarSearch ||
    (a.title || '').toLowerCase().includes(avatarSearch.toLowerCase()) ||
    (a.character_name || '').toLowerCase().includes(avatarSearch.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white/20" />
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">

        {/* ── Sélection profil ── */}
        {!showCreate && !pinPrompt && (
          <motion.div key="select"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-10 w-full max-w-lg px-6"
          >
            <h1 className="text-white font-black text-4xl md:text-5xl">Qui est-ce ?</h1>

            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              {profiles.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex flex-col items-center gap-2.5 group relative"
                >
                  {deleting && (
                    <button onClick={() => deleteProfile(p.id)}
                      className="absolute -top-1 -right-1 z-10 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                  <button onClick={() => !deleting && selectProfile(p)}
                    className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-transparent group-hover:border-white transition-all relative shadow-lg group-hover:scale-105"
                  >
                    {p.avatar_url
                      ? <Image src={p.avatar_url} alt={p.name} fill className="object-cover" sizes="112px" />
                      : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-10 h-10 text-white/30" /></div>
                    }
                    {p.pin && (
                      <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 bg-gradient-to-t from-black/50 to-transparent transition-all">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/60 text-sm group-hover:text-white transition-colors">{p.name}</span>
                    <button onClick={() => openEdit(p)} className="opacity-0 group-hover:opacity-100 transition-all">
                      <Edit2 className="w-3 h-3 text-white/40 hover:text-white" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {profiles.length < 5 && (
                <div className="flex flex-col items-center gap-2.5">
                  <button onClick={openCreate}
                    className="w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-dashed border-white/20 hover:border-white/50 flex items-center justify-center transition-all hover:scale-105">
                    <Plus className="w-8 h-8 text-white/30" />
                  </button>
                  <span className="text-white/30 text-sm">Ajouter</span>
                </div>
              )}
            </div>

            <button onClick={() => setDeleting(d => !d)}
              className={`px-5 py-2 rounded-xl border text-xs font-bold tracking-widest transition-all ${deleting ? 'border-red-500/50 text-red-400' : 'border-white/10 text-white/25 hover:text-white/50 hover:border-white/25'}`}>
              {deleting ? 'TERMINER' : 'SUPPRIMER DES PROFILS'}
            </button>
          </motion.div>
        )}

        {/* ── PIN prompt ── */}
        {pinPrompt && !showCreate && (
          <motion.div key="pin"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 px-6"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/10">
              {pinPrompt.avatar_url
                ? <Image src={pinPrompt.avatar_url} alt={pinPrompt.name} width={80} height={80} className="object-cover" />
                : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-8 h-8 text-white/30" /></div>}
            </div>
            <div className="text-center">
              <h2 className="text-white text-xl font-bold">{pinPrompt.name}</h2>
              <p className="text-white/40 text-sm mt-1">Entrez votre code PIN</p>
            </div>
            <div className="flex gap-3">
              {[0,1,2,3].map(i => (
                <motion.div key={i}
                  animate={{ scale: i < pinInput.length ? 1.2 : 1, backgroundColor: i < pinInput.length ? '#fff' : 'rgba(255,255,255,0.15)' }}
                  className="w-3 h-3 rounded-full" />
              ))}
            </div>
            {pinError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm">Code incorrect</motion.p>}
            <div className="grid grid-cols-3 gap-3 w-56">
              {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
                <button key={i} disabled={k === ''}
                  onClick={() => {
                    if (k === '⌫') { setPinInput(p => p.slice(0,-1)); setPinError(false) }
                    else if (pinInput.length < 4) {
                      const next = pinInput + k
                      setPinInput(next)
                      if (next.length === 4) setTimeout(() => {
                        if (next === pinPrompt.pin) { setActiveProfile(pinPrompt); router.push('/') }
                        else { setPinError(true); setPinInput('') }
                      }, 150)
                    }
                  }}
                  className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-90 ${k === '' ? 'invisible' : 'text-white'} ${pinError ? 'bg-red-500/15' : 'bg-white/[0.07] hover:bg-white/15'}`}
                >{k}</button>
              ))}
            </div>
            <button onClick={() => { setPinPrompt(null); setPinError(false) }} className="text-white/30 hover:text-white text-sm transition-colors">← Retour</button>
          </motion.div>
        )}

        {/* ── Création/édition — Sheet mobile style ── */}
        {showCreate && (
          <motion.div key="create" className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => setShowCreate(false)} />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full md:max-w-xl md:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col"
              style={{
                background: 'rgba(18,18,20,0.98)',
                backdropFilter: 'blur(40px)',
                border: '1px solid rgba(255,255,255,0.07)',
                maxHeight: '92vh',
              }}
            >
              {/* Handle mobile */}
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header avec avatar preview */}
              <div className="px-5 pt-3 pb-4 flex items-center gap-3 border-b border-white/[0.06]">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                  {formAvatar
                    ? <Image src={formAvatar} alt="avatar" width={48} height={48} className="object-cover w-full h-full" />
                    : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-5 h-5 text-white/30" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white text-lg font-bold">Personnalisation</h3>
                  <p className="text-white/40 text-xs truncate">{formName || 'Nouveau profil'}</p>
                </div>
                <button onClick={() => setShowCreate(false)}
                  className="w-8 h-8 rounded-full bg-white/08 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {/* Tabs scrollables */}
              <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide border-b border-white/[0.05]"
                style={{ scrollbarWidth: 'none' }}>
                {(['general', 'avatar'] as Tab[]).map(t => (
                  <button key={t} onClick={() => { setTab(t); setFormError(null) }}
                    className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 transition-all relative"
                    style={{
                      background: tab === t ? '#fff' : 'rgba(255,255,255,0.06)',
                      color: tab === t ? '#000' : 'rgba(255,255,255,0.45)',
                      border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {t === 'general' ? <><User className="w-3.5 h-3.5" />Général</> : <><Search className="w-3.5 h-3.5" />Avatar</>}
                    {/* Point rouge si avatar manquant */}
                    {t === 'avatar' && !formAvatar && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute -top-0.5 -right-0.5" />
                    )}
                  </button>
                ))}
              </div>

              {/* Content scrollable */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4" style={{ scrollbarWidth: 'none' }}>
                <AnimatePresence mode="wait">

                  {/* ── Général ── */}
                  {tab === 'general' && (
                    <motion.div key="gen" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                      className="space-y-4">

                      <div>
                        <label className="text-white/50 text-xs font-semibold mb-2 block">Nom du profil</label>
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <User className="w-4 h-4 text-white/25" />
                          <input value={formName} onChange={e => setFormName(e.target.value)}
                            placeholder="Ex: John Doe"
                            className="bg-transparent text-white text-base outline-none flex-1 placeholder-white/20" />
                        </div>
                      </div>

                      <div>
                        <label className="text-white/50 text-xs font-semibold mb-2 block">Code PIN (4 chiffres)</label>
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Lock className="w-4 h-4 text-white/25" />
                          <input value={formPin} onChange={e => setFormPin(e.target.value.replace(/\D/g,'').slice(0,4))}
                            placeholder="Laisser vide pour désactiver"
                            type="password" inputMode="numeric" maxLength={4}
                            className="bg-transparent text-white text-base outline-none flex-1 placeholder-white/20" />
                        </div>
                      </div>

                    </motion.div>
                  )}

                  {/* ── Avatar ── */}
                  {tab === 'avatar' && (
                    <motion.div key="av" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                      className="space-y-4">

                      {/* Grid avatars */}
                      <div>
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-3"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Search className="w-4 h-4 text-white/30" />
                          <input value={avatarSearch} onChange={e => setAvatarSearch(e.target.value)}
                            placeholder="Rechercher un avatar..."
                            className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/20" />
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                          {filteredAvatars.map((a: any, i) => (
                            <motion.button key={a.id || i}
                              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.015 }}
                              onClick={() => setFormAvatar(a.image_url)}
                              className="aspect-square rounded-xl overflow-hidden relative transition-all"
                              style={{
                                border: formAvatar === a.image_url ? '2.5px solid #fff' : '2px solid transparent',
                                boxShadow: formAvatar === a.image_url ? '0 0 16px rgba(255,255,255,0.25)' : 'none',
                              }}>
                              <Image src={a.image_url} alt={a.title || ''} width={100} height={100} className="object-cover w-full h-full" />
                              {formAvatar === a.image_url && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <Check className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Discord sync */}
                      <div className="rounded-2xl p-4" style={{ background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.25)' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                            <Image src="/discord-logo.png" alt="Discord" width={40} height={40} className="object-cover" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-bold">Synchroniser Discord</p>
                            <p className="text-white/40 text-xs">Récupérer votre photo de profil</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input value={discordId} onChange={e => setDiscordId(e.target.value)}
                            placeholder="Votre ID Discord"
                            className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none text-white placeholder-white/25"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
                          <button onClick={syncDiscord} disabled={discordLoading || !discordId.trim()}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-40 flex-shrink-0"
                            style={{ background: 'rgba(88,101,242,0.85)' }}>
                            {discordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                            SYNC
                          </button>
                        </div>
                      </div>

                      {/* Upload */}
                      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-white/50 text-sm font-semibold mb-3">Téléverser un avatar local</p>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()}
                          className="w-full rounded-xl py-6 flex flex-col items-center gap-2 hover:bg-white/5 transition-all"
                          style={{ border: '1.5px dashed rgba(255,255,255,0.12)' }}>
                          {uploadLoading ? <Loader2 className="w-6 h-6 animate-spin text-white/30" /> : <Upload className="w-6 h-6 text-white/30" />}
                          <span className="text-sm font-semibold text-white/40">Sélectionnez ou glissez un fichier</span>
                          <span className="text-xs text-white/20">PNG, JPG ou WEBP</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-white/[0.05] flex-shrink-0"
                style={{ background: 'rgba(0,0,0,0.3)' }}>
                {formError && (
                  <p className="text-red-400 text-xs mb-3 text-center">{formError}</p>
                )}
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-white/40 hover:text-white text-sm font-medium transition-colors">
                    Annuler
                  </button>
                  <button onClick={saveProfile} disabled={saving}
                    className="px-6 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 disabled:opacity-40 transition-all"
                    style={{ background: '#fff', color: '#000' }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editProfile ? 'Enregistrer' : 'Créer le profil'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
