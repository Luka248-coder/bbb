'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check, Search, User, Lock, Loader2, Edit2, Upload, Link as LinkIcon, Baby } from 'lucide-react'
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
  const [formChild, setFormChild] = useState(false)
  const [avatars, setAvatars] = useState<any[]>([])
  const [avatarSearch, setAvatarSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Upload / Discord sync
  const [discordId, setDiscordId] = useState('')
  const [discordLoading, setDiscordLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfiles().then(() => setLoading(false))
    fetch('/api/profile-avatars').then(r => r.json()).then(setAvatars).catch(() => {})
  }, [])

  const openCreate = () => {
    setFormName('Nouveau Profil'); setFormPin(''); setFormAvatar(null)
    setFormChild(false); setTab('general'); setEditProfile(null); setShowCreate(true)
  }
  const openEdit = (p: Profile) => {
    setFormName(p.name); setFormPin(p.pin || ''); setFormAvatar(p.avatar_url)
    setFormChild(p.is_child); setTab('general'); setEditProfile(p); setShowCreate(true)
  }

  const saveProfile = async () => {
    setSaving(true)
    const body = { name: formName, pin: formPin || null, avatar_url: formAvatar, is_child: formChild }
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
      // Discord CDN avatar format
      const res = await fetch(`https://api.lanyard.rest/v1/users/${discordId.trim()}`)
      if (res.ok) {
        const data = await res.json()
        const avatar = data.data?.discord_user?.avatar
        const id = data.data?.discord_user?.id
        if (avatar && id) {
          setFormAvatar(`https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=256`)
        }
      }
    } catch {}
    setDiscordLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        setFormAvatar(url)
      } else {
        // Fallback local preview
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
      <Loader2 className="w-8 h-8 animate-spin text-white/30" />
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 overflow-hidden">
      <AnimatePresence mode="wait">

        {/* ── Sélection profil ── */}
        {!showCreate && !pinPrompt && (
          <motion.div key="select"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col items-center gap-12 w-full max-w-lg"
          >
            <motion.h1
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-white font-black" style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}
            >
              Qui est-ce ?
            </motion.h1>

            <div className="flex flex-wrap justify-center gap-8">
              {profiles.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.06 }}
                  className="flex flex-col items-center gap-3 group relative"
                >
                  {deleting && (
                    <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
                      onClick={() => deleteProfile(p.id)}
                      className="absolute -top-1 -right-1 z-10 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition-colors">
                      <X className="w-3 h-3 text-white" />
                    </motion.button>
                  )}
                  <button onClick={() => !deleting && selectProfile(p)}
                    className="w-28 h-28 rounded-full overflow-hidden border-2 border-transparent group-hover:border-white transition-all duration-200 relative shadow-lg group-hover:shadow-white/20 group-hover:scale-105"
                  >
                    {p.avatar_url
                      ? <Image src={p.avatar_url} alt={p.name} fill className="object-cover" sizes="112px" />
                      : <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <User className="w-12 h-12 text-white/30" />
                        </div>
                    }
                    {p.pin && (
                      <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-all bg-gradient-to-t from-black/40 to-transparent">
                        <Lock className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/70 text-sm group-hover:text-white transition-colors">{p.name}</span>
                    <button onClick={() => openEdit(p)} className="opacity-0 group-hover:opacity-100 transition-all">
                      <Edit2 className="w-3 h-3 text-white/40 hover:text-white" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {profiles.length < 5 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + profiles.length * 0.06 }}
                  className="flex flex-col items-center gap-3">
                  <button onClick={openCreate}
                    className="w-28 h-28 rounded-full border-2 border-dashed border-white/20 hover:border-white/50 flex items-center justify-center transition-all hover:scale-105 hover:bg-white/5"
                  >
                    <Plus className="w-8 h-8 text-white/30" />
                  </button>
                  <span className="text-white/30 text-sm">Ajouter</span>
                </motion.div>
              )}
            </div>

            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              onClick={() => setDeleting(d => !d)}
              className={`px-6 py-2.5 rounded-xl border text-xs font-bold tracking-widest transition-all ${deleting ? 'border-red-500/60 text-red-400 bg-red-500/5' : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white/60'}`}
            >
              {deleting ? 'TERMINER' : 'SUPPRIMER DES PROFILS'}
            </motion.button>
          </motion.div>
        )}

        {/* ── PIN prompt ── */}
        {pinPrompt && !showCreate && (
          <motion.div key="pin"
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/10">
              {pinPrompt.avatar_url
                ? <Image src={pinPrompt.avatar_url} alt={pinPrompt.name} width={80} height={80} className="object-cover" />
                : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-8 h-8 text-white/30" /></div>
              }
            </div>
            <div className="text-center">
              <h2 className="text-white text-2xl font-bold">{pinPrompt.name}</h2>
              <p className="text-white/40 text-sm mt-1">Entrez votre code PIN</p>
            </div>
            <div className="flex gap-3">
              {[0,1,2,3].map(i => (
                <motion.div key={i}
                  animate={{ scale: i < pinInput.length ? 1.2 : 1, backgroundColor: i < pinInput.length ? '#fff' : 'rgba(255,255,255,0.15)' }}
                  className="w-3 h-3 rounded-full"
                />
              ))}
            </div>
            {pinError && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm">
                Code incorrect
              </motion.p>
            )}
            <div className="grid grid-cols-3 gap-2.5 w-52">
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
                  className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-90 ${k === '' ? 'invisible' : `text-white ${pinError ? 'bg-red-500/20 hover:bg-red-500/30' : 'bg-white/8 hover:bg-white/15'}`}`}
                  style={{ background: k === '' ? 'transparent' : pinError ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)' }}
                >
                  {k}
                </button>
              ))}
            </div>
            <button onClick={() => { setPinPrompt(null); setPinError(false) }}
              className="text-white/30 hover:text-white/70 text-sm transition-colors mt-2">
              ← Retour
            </button>
          </motion.div>
        )}

        {/* ── Création / édition ── */}
        {showCreate && (
          <motion.div key="create"
            initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-4xl rounded-3xl overflow-hidden flex relative"
            style={{
              background: 'linear-gradient(135deg, rgba(18,18,22,0.98) 0%, rgba(10,10,14,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset',
              minHeight: '560px',
            }}
          >
            {/* Glow background */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, rgba(120,80,255,0.3) 0%, transparent 70%)' }} />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, rgba(255,100,80,0.4) 0%, transparent 70%)' }} />
            </div>

            {/* Left preview */}
            <div className="w-56 flex-shrink-0 flex flex-col items-center justify-center gap-5 relative"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden ring-2 ring-white/10 shadow-2xl">
                  {formAvatar
                    ? <Image src={formAvatar} alt="avatar" width={128} height={128} className="object-cover w-full h-full" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <User className="w-12 h-12 text-white/20" />
                      </div>
                  }
                </div>
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ boxShadow: '0 0 40px rgba(120,80,255,0.15)', borderRadius: '50%' }} />
              </div>
              <div className="text-center px-4">
                <h2 className="text-white font-bold text-lg leading-tight">{formName || 'Nouveau Profil'}</h2>
                {formChild && (
                  <div className="mt-1.5 flex items-center justify-center gap-1">
                    <Baby className="w-3 h-3 text-blue-400" />
                    <span className="text-blue-400 text-xs font-medium">Profil enfant</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <div className="px-7 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white text-lg font-bold tracking-tight">Personnalisation</h3>
                  <button onClick={() => setShowCreate(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <X className="w-4 h-4 text-white/70" />
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {(['general', 'avatar'] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className="px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5"
                      style={{
                        background: tab === t ? '#fff' : 'rgba(255,255,255,0.05)',
                        color: tab === t ? '#000' : 'rgba(255,255,255,0.45)',
                        border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {t === 'general' ? <><User className="w-3.5 h-3.5" />Général</> : <><Search className="w-3.5 h-3.5" />Avatar</>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-7 py-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                <AnimatePresence mode="wait">
                  {tab === 'general' && (
                    <motion.div key="gen" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.2 }} className="flex flex-col gap-5"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-white/40 text-xs font-semibold mb-2 block tracking-wider">NOM DU PROFIL</label>
                          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <User className="w-4 h-4 text-white/25 flex-shrink-0" />
                            <input value={formName} onChange={e => setFormName(e.target.value)}
                              placeholder="Ex: John Doe"
                              className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/20"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-white/40 text-xs font-semibold mb-2 block tracking-wider">CODE PIN (4 chiffres)</label>
                          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Lock className="w-4 h-4 text-white/25 flex-shrink-0" />
                            <input value={formPin} onChange={e => setFormPin(e.target.value.replace(/\D/g,'').slice(0,4))}
                              placeholder="Laisser vide pour désact." type="password" inputMode="numeric" maxLength={4}
                              className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/20"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-white/40 text-xs font-semibold mb-2 block tracking-wider">TYPE DE PROFIL</label>
                        <div className="rounded-xl p-4 flex items-center justify-between transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.2)' }}>
                              <Baby className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                              <div className="text-white text-sm font-semibold">Profil enfant</div>
                              <div className="text-white/35 text-xs">Interface et contenu adaptés aux plus jeunes</div>
                            </div>
                          </div>
                          <button onClick={() => setFormChild(c => !c)}
                            className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
                            style={{ background: formChild ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.12)' }}
                          >
                            <motion.div animate={{ left: formChild ? '22px' : '2px' }}
                              className="w-5 h-5 rounded-full absolute top-0.5 shadow-sm"
                              style={{ background: formChild ? '#000' : 'rgba(255,255,255,0.5)' }}
                            />
                          </button>
                        </div>
                        <p className="text-white/25 text-xs mt-2">La catégorie d'âge se règle ensuite dans Paramètres → Gestion des profils.</p>
                      </div>
                    </motion.div>
                  )}

                  {tab === 'avatar' && (
                    <motion.div key="av" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }} className="flex flex-col gap-5"
                    >
                      {/* Discord sync */}
                      <div className="rounded-xl p-4" style={{ background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.2)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="rgba(88,101,242,1)">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.073.11 18.089.127 18.1a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                          </svg>
                          <span className="text-sm font-semibold text-white">Synchroniser Discord</span>
                          <span className="text-xs text-white/40">Récupérer votre photo de profil</span>
                        </div>
                        <div className="flex gap-2">
                          <input value={discordId} onChange={e => setDiscordId(e.target.value)}
                            placeholder="Votre ID Discord"
                            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none text-white placeholder-white/25"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                          <button onClick={syncDiscord} disabled={discordLoading || !discordId.trim()}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-40 transition-all"
                            style={{ background: 'rgba(88,101,242,0.8)' }}
                          >
                            {discordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                            SYNC
                          </button>
                        </div>
                      </div>

                      {/* Upload local */}
                      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-sm font-semibold text-white/60 mb-3">Téléverser un avatar local</p>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()}
                          className="w-full rounded-xl py-6 flex flex-col items-center gap-2 transition-all hover:bg-white/5"
                          style={{ border: '1.5px dashed rgba(255,255,255,0.12)' }}
                        >
                          {uploadLoading
                            ? <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                            : <Upload className="w-6 h-6 text-white/30" />
                          }
                          <span className="text-sm font-semibold text-white/40">Sélectionnez ou glissez un fichier</span>
                          <span className="text-xs text-white/20">PNG, JPG ou WEBP</span>
                        </button>
                      </div>

                      {/* Avatar grid */}
                      <div>
                        <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Search className="w-4 h-4 text-white/30" />
                          <input value={avatarSearch} onChange={e => setAvatarSearch(e.target.value)}
                            placeholder="Rechercher un avatar..."
                            className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/20"
                          />
                        </div>
                        <p className="text-white/30 text-xs mb-3 tracking-wide">AVATARS DISPONIBLES</p>
                        <div className="grid grid-cols-5 gap-2">
                          {filteredAvatars.map((a: any, i) => (
                            <motion.button
                              key={a.id || i}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.02, duration: 0.25 }}
                              onClick={() => setFormAvatar(a.image_url)}
                              className="aspect-square rounded-xl overflow-hidden transition-all relative"
                              style={{
                                border: formAvatar === a.image_url ? '2px solid #fff' : '2px solid transparent',
                                transform: formAvatar === a.image_url ? 'scale(1.06)' : 'scale(1)',
                                boxShadow: formAvatar === a.image_url ? '0 0 20px rgba(255,255,255,0.2)' : 'none',
                              }}
                            >
                              <Image src={a.image_url} alt={a.character_name || a.title || ''} width={100} height={100}
                                className="object-cover w-full h-full" />
                              {formAvatar === a.image_url && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Check className="w-5 h-5 text-white drop-shadow" />
                                </div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                        {filteredAvatars.length === 0 && (
                          <p className="text-center text-white/20 text-sm py-8">Aucun avatar trouvé</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-7 py-5 flex items-center justify-end gap-3 flex-shrink-0"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                <button onClick={() => setShowCreate(false)}
                  className="px-5 py-2.5 text-white/40 hover:text-white text-sm transition-colors font-medium">
                  Annuler
                </button>
                <button onClick={saveProfile} disabled={saving || !formName.trim()}
                  className="px-6 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: '#fff', color: '#000' }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editProfile ? 'Enregistrer' : 'Créer le profil'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
