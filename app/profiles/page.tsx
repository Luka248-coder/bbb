'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check, Search, ChevronLeft, User, Lock, Loader2, Trash2, Edit2 } from 'lucide-react'
import Image from 'next/image'
import { useProfile, Profile } from '@/contexts/ProfileContext'

type Tab = 'general' | 'avatar'

const DEFAULT_AVATARS = [
  'https://i.imgur.com/gqS0QIi.jpeg',
  'https://i.imgur.com/5oSMRxL.jpeg',
  'https://i.imgur.com/8fxgqKO.jpeg',
  'https://i.imgur.com/P2yXJhz.jpeg',
  'https://i.imgur.com/jVmBYNI.jpeg',
  'https://i.imgur.com/bqKFKI0.jpeg',
]

export default function ProfilesPage() {
  const router = useRouter()
  const { activeProfile, setActiveProfile, profiles, loadProfiles } = useProfile()

  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editProfile, setEditProfile] = useState<Profile | null>(null)
  const [pinPrompt, setPinPrompt] = useState<Profile | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)

  // Création / édition
  const [tab, setTab] = useState<Tab>('general')
  const [formName, setFormName] = useState('Nouveau Profil')
  const [formPin, setFormPin] = useState('')
  const [formAvatar, setFormAvatar] = useState<string | null>(null)
  const [formChild, setFormChild] = useState(false)
  const [avatars, setAvatars] = useState<any[]>([])
  const [avatarSearch, setAvatarSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfiles().then(() => setLoading(false))
    fetch('/api/profile-avatars').then(r => r.json()).then(setAvatars).catch(() => {})
  }, [])

  const openCreate = () => {
    setFormName('Nouveau Profil')
    setFormPin('')
    setFormAvatar(null)
    setFormChild(false)
    setTab('general')
    setEditProfile(null)
    setShowCreate(true)
  }

  const openEdit = (p: Profile) => {
    setFormName(p.name)
    setFormPin(p.pin || '')
    setFormAvatar(p.avatar_url)
    setFormChild(p.is_child)
    setTab('general')
    setEditProfile(p)
    setShowCreate(true)
  }

  const saveProfile = async () => {
    setSaving(true)
    const body = { name: formName, pin: formPin || null, avatar_url: formAvatar, is_child: formChild }
    try {
      if (editProfile) {
        const res = await fetch('/api/profiles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editProfile.id, ...body }) })
        if (res.ok) { await loadProfiles(); setShowCreate(false) }
      } else {
        const res = await fetch('/api/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (res.ok) { await loadProfiles(); setShowCreate(false) }
      }
    } catch {}
    setSaving(false)
  }

  const deleteProfile = async (id: string) => {
    if (!confirm('Supprimer ce profil ?')) return
    setDeleting(true)
    await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' })
    await loadProfiles()
    setDeleting(false)
  }

  const selectProfile = (p: Profile) => {
    if (p.pin) {
      setPinPrompt(p)
      setPinInput('')
      setPinError(false)
    } else {
      setActiveProfile(p)
      router.push('/')
    }
  }

  const submitPin = () => {
    if (pinInput === pinPrompt?.pin) {
      setActiveProfile(pinPrompt!)
      router.push('/')
    } else {
      setPinError(true)
      setPinInput('')
    }
  }

  const filteredAvatars = avatars.filter(a =>
    !avatarSearch || (a.title || '').toLowerCase().includes(avatarSearch.toLowerCase()) ||
    (a.character_name || '').toLowerCase().includes(avatarSearch.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white/40" />
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">

      {/* Sélection profil */}
      <AnimatePresence mode="wait">
        {!showCreate && !pinPrompt && (
          <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-10 w-full max-w-lg"
          >
            <h1 className="text-white text-5xl font-black">Qui est-ce ?</h1>

            <div className="flex flex-wrap justify-center gap-6">
              {profiles.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-3 group relative">
                  {deleting && (
                    <button onClick={() => deleteProfile(p.id)}
                      className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                  <button onClick={() => !deleting && selectProfile(p)}
                    className="w-28 h-28 rounded-full overflow-hidden border-2 border-transparent group-hover:border-white transition-all relative"
                  >
                    {p.avatar_url
                      ? <Image src={p.avatar_url} alt={p.name} fill className="object-cover" />
                      : <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <User className="w-12 h-12 text-white/40" />
                        </div>
                    }
                    {p.pin && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-end justify-center pb-1 transition-all">
                        <Lock className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-white/70 text-sm">{p.name}</span>
                    <button onClick={() => openEdit(p)} className="opacity-0 group-hover:opacity-100 transition-all">
                      <Edit2 className="w-3 h-3 text-white/40 hover:text-white" />
                    </button>
                  </div>
                </div>
              ))}

              {profiles.length < 5 && (
                <div className="flex flex-col items-center gap-3">
                  <button onClick={openCreate}
                    className="w-28 h-28 rounded-2xl border-2 border-dashed border-white/20 hover:border-white/50 flex items-center justify-center transition-all"
                  >
                    <Plus className="w-8 h-8 text-white/40" />
                  </button>
                  <span className="text-white/40 text-sm">Ajouter</span>
                </div>
              )}
            </div>

            <button onClick={() => setDeleting(d => !d)}
              className={`px-6 py-3 rounded-xl border text-sm font-semibold tracking-widest transition-all ${deleting ? 'border-red-500 text-red-400' : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/80'}`}
            >
              {deleting ? 'TERMINER' : 'SUPPRIMER DES PROFILS'}
            </button>
          </motion.div>
        )}

        {/* PIN prompt */}
        {pinPrompt && !showCreate && (
          <motion.div key="pin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden">
              {pinPrompt.avatar_url
                ? <Image src={pinPrompt.avatar_url} alt={pinPrompt.name} width={80} height={80} className="object-cover" />
                : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-8 h-8 text-white/40" /></div>
              }
            </div>
            <div className="text-center">
              <h2 className="text-white text-2xl font-bold">{pinPrompt.name}</h2>
              <p className="text-white/50 text-sm mt-1">Entrez votre code PIN</p>
            </div>
            <div className="flex gap-3">
              {[0,1,2,3].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < pinInput.length ? 'bg-white' : 'bg-white/20'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 w-52">
              {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
                <button key={i} disabled={k === ''}
                  onClick={() => {
                    if (k === '⌫') setPinInput(p => p.slice(0,-1))
                    else if (pinInput.length < 4) {
                      const next = pinInput + k
                      setPinInput(next)
                      if (next.length === 4) setTimeout(() => {
                        if (next === pinPrompt.pin) { setActiveProfile(pinPrompt); router.push('/') }
                        else { setPinError(true); setPinInput('') }
                      }, 200)
                    }
                  }}
                  className={`h-14 rounded-xl text-xl font-semibold transition-all ${k === '' ? 'invisible' : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'} ${pinError ? 'bg-red-500/20' : ''}`}
                >
                  {k}
                </button>
              ))}
            </div>
            {pinError && <p className="text-red-400 text-sm">Code incorrect</p>}
            <button onClick={() => { setPinPrompt(null); setPinError(false) }} className="text-white/40 hover:text-white text-sm transition-colors">
              ← Retour
            </button>
          </motion.div>
        )}

        {/* Création / édition profil */}
        {showCreate && (
          <motion.div key="create" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="w-full max-w-4xl bg-zinc-900 rounded-3xl overflow-hidden flex"
            style={{ minHeight: '520px', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Left preview */}
            <div className="w-64 flex-shrink-0 flex flex-col items-center justify-center gap-4 bg-black/30 p-8">
              <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-white/10">
                {formAvatar
                  ? <Image src={formAvatar} alt="avatar" width={144} height={144} className="object-cover w-full h-full" />
                  : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-14 h-14 text-white/30" /></div>
                }
              </div>
              <h2 className="text-white text-xl font-bold text-center">{formName || 'Nouveau Profil'}</h2>
            </div>

            {/* Right content */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="px-8 pt-7 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white text-xl font-bold">Personnalisation</h3>
                  <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                {/* Tabs */}
                <div className="flex gap-2">
                  {(['general', 'avatar'] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${tab === t ? 'bg-white text-black' : 'bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white'}`}
                    >
                      {t === 'general' ? <><User className="w-3.5 h-3.5" /> Général</> : <><Search className="w-3.5 h-3.5" /> Avatar</>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                {tab === 'general' && (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-white/60 text-xs font-semibold mb-2 block">NOM DU PROFIL</label>
                        <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5">
                          <User className="w-4 h-4 text-white/30 flex-shrink-0" />
                          <input value={formName} onChange={e => setFormName(e.target.value)}
                            placeholder="Ex: John Doe"
                            className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/25"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-white/60 text-xs font-semibold mb-2 block">CODE PIN (4 chiffres)</label>
                        <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5">
                          <Lock className="w-4 h-4 text-white/30 flex-shrink-0" />
                          <input value={formPin} onChange={e => setFormPin(e.target.value.replace(/\D/g,'').slice(0,4))}
                            placeholder="Laisser vide pour désact."
                            type="password" inputMode="numeric" maxLength={4}
                            className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/25"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-white/60 text-xs font-semibold mb-2 block">TYPE DE PROFIL</label>
                      <div className="bg-white/[0.06] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">😊</div>
                          <div>
                            <div className="text-white text-sm font-semibold">Profil enfant</div>
                            <div className="text-white/40 text-xs">Interface et contenu adaptés aux plus jeunes</div>
                          </div>
                        </div>
                        <button onClick={() => setFormChild(c => !c)}
                          className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${formChild ? 'bg-white' : 'bg-white/20'}`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-black absolute top-0.5 transition-all ${formChild ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <p className="text-white/30 text-xs mt-2">La catégorie d'âge se règle ensuite dans Paramètres → Gestion des profils.</p>
                    </div>
                  </div>
                )}

                {tab === 'avatar' && (
                  <div className="flex flex-col gap-4">
                    {/* Search */}
                    <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2">
                      <Search className="w-4 h-4 text-white/30" />
                      <input value={avatarSearch} onChange={e => setAvatarSearch(e.target.value)}
                        placeholder="Rechercher un avatar..."
                        className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/25"
                      />
                    </div>

                    {/* Avatar grid */}
                    <div>
                      <p className="text-white/40 text-xs mb-3">Avatars disponibles</p>
                      <div className="grid grid-cols-5 gap-2">
                        {(filteredAvatars.length > 0 ? filteredAvatars : DEFAULT_AVATARS.map((url, i) => ({ id: i, image_url: url, title: 'Avatar', character_name: null }))).map((a: any, i) => (
                          <button key={a.id || i} onClick={() => setFormAvatar(a.image_url)}
                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${formAvatar === a.image_url ? 'border-white scale-105' : 'border-transparent hover:border-white/40'}`}
                          >
                            <Image src={a.image_url} alt={a.character_name || a.title} width={80} height={80} className="object-cover w-full h-full" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-white/[0.06] flex items-center justify-end gap-3">
                <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-white/60 hover:text-white text-sm transition-colors">
                  Annuler
                </button>
                <button onClick={saveProfile} disabled={saving || !formName.trim()}
                  className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-xl flex items-center gap-2 hover:bg-white/90 transition-all disabled:opacity-50"
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
