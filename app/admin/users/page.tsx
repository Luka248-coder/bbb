'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, Trash2, Ban, WifiOff, Eye, EyeOff,
  X, AlertTriangle, Check, Wifi, Crown, UserCheck, User,
  Activity, Calendar, Mail, MonitorPlay, Heart, MessageSquare,
  RefreshCw, Film, Tv, ChevronRight
} from 'lucide-react'

interface UserData {
  id: string; discord_id: string; username: string; avatar: string | null
  email: string | null; is_admin: boolean; is_banned: boolean
  is_disabled: boolean; disabled_reason: string | null
  role: 'user' | 'staff' | 'admin'; last_ip: string | null
  last_seen: string | null; created_at: string; updated_at: string
}

interface WatchItem {
  id: string; title: string; content_type: 'movie' | 'series'
  poster: string | null; season: number | null; episode: number | null
  progress: number; watched_at: string
  profiles?: { name: string; avatar_url: string | null } | null
}

interface UserDetail { user: UserData; history: WatchItem[]; favorites: any[]; requests: any[] }

const roleConfig = {
  user:  { label: 'Utilisateur', icon: User,      color: 'text-zinc-400',  bg: 'bg-zinc-800',   border: 'border-zinc-700'  },
  staff: { label: 'Staff',       icon: UserCheck,  color: 'text-blue-400',  bg: 'bg-blue-950',   border: 'border-blue-800'  },
  admin: { label: 'Admin',       icon: Crown,      color: 'text-amber-400', bg: 'bg-amber-950',  border: 'border-amber-800' },
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff/60000), hours = Math.floor(diff/3600000), days = Math.floor(diff/86400000)
  if (days > 0) return `il y a ${days}j`; if (hours > 0) return `il y a ${hours}h`
  if (mins > 0) return `il y a ${mins}min`; return 'à l\'instant'
}

function Avatar({ user, size = 40 }: { user: Pick<UserData,'discord_id'|'avatar'|'username'>, size?: number }) {
  const url = user.avatar ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png` : null
  return url
    ? <Image src={url} alt={user.username} width={size} height={size} className="rounded-full object-cover" style={{width:size,height:size}} />
    : <div className="rounded-full bg-zinc-700 flex items-center justify-center font-bold text-white flex-shrink-0" style={{width:size,height:size,fontSize:size*0.4}}>{user.username[0].toUpperCase()}</div>
}

function ConfirmModal({ title, message, onConfirm, onCancel }: { title:string, message:string, onConfirm:()=>void, onCancel:()=>void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4">
        <div className="w-12 h-12 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-white font-bold text-lg text-center mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-semibold">Annuler</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors">Confirmer</button>
        </div>
      </motion.div>
    </div>
  )
}

function DisableModal({ onConfirm, onCancel }: { onConfirm:(r:string)=>void, onCancel:()=>void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4">
        <div className="w-12 h-12 rounded-xl bg-orange-950 border border-orange-800 flex items-center justify-center mx-auto mb-4">
          <EyeOff className="w-6 h-6 text-orange-400" />
        </div>
        <h3 className="text-white font-bold text-lg text-center mb-2">Désactiver le compte</h3>
        <p className="text-zinc-400 text-sm text-center mb-4">Cette raison sera affichée à l'utilisateur.</p>
        <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Raison de désactivation..." rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500/50 resize-none mb-4 placeholder-zinc-600" />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-semibold">Annuler</button>
          <button onClick={()=>onConfirm(reason||'Compte désactivé temporairement.')}
            className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-colors">Désactiver</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selected, setSelected] = useState<UserDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [confirm, setConfirm] = useState<{title:string,message:string,action:()=>void}|null>(null)
  const [disableModal, setDisableModal] = useState(false)
  const [ipBanned, setIpBanned] = useState<Record<string,boolean>>({})
  const [activeTab, setActiveTab] = useState<'info'|'history'|'favorites'|'requests'|'profiles'>('info')
  const [userProfiles, setUserProfiles] = useState<any[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)

  const fetchUsers = useCallback(async (p = 0, s = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (s) params.set('search', s)
      const res = await fetch(`/api/auth/admin/users?${params}`)
      if (res.ok) {
        const json = await res.json()
        setUsers(json.data || [])
        setTotal(json.total || 0)
        setPage(p)
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers(0, search) }, [fetchUsers])

  // Debounce la recherche
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      fetchUsers(0, searchInput)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const openUser = async (user: UserData) => {
    setLoadingDetail(true); setSelected(null); setActiveTab('info'); setUserProfiles([])
    try {
      const res = await fetch(`/api/auth/admin/users?id=${user.id}`)
      if (res.ok) setSelected(await res.json())
      // Charger les profils
      setLoadingProfiles(true)
      const pRes = await fetch(`/api/auth/admin/user-profiles?user_id=${user.id}`)
      if (pRes.ok) setUserProfiles(await pRes.json())
      setLoadingProfiles(false)
    } catch {}
    setLoadingDetail(false)
  }

  const patch = async (id: string, data: object) => {
    try {
      const res = await fetch('/api/auth/admin/users', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id,...data}) })
      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(u => u.id === id ? {...u,...updated} : u))
        setSelected(prev => prev ? {...prev, user:{...prev.user,...updated}} : prev)
      }
    } catch {}
  }

  const deleteUser = async (id: string) => {
    try { await fetch(`/api/auth/admin/users?id=${id}`, {method:'DELETE'}); setUsers(prev=>prev.filter(u=>u.id!==id)); setSelected(null) } catch {}
  }

  const banIp = async (ip: string, unban=false) => {
    const action = unban ? 'unban_ip' : 'ban_ip'
    await fetch(`/api/auth/admin/users?action=${action}&ip=${encodeURIComponent(ip)}`, {method:'DELETE'})
    setIpBanned(prev=>({...prev,[ip]:!unban}))
  }

  const filtered = users  // filtrage fait côté serveur

  const u = selected?.user

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">

      {/* LIST */}
      <div className="w-80 flex-shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-black text-white flex items-center gap-2"><Users className="w-5 h-5 text-primary"/>Utilisateurs</h1>
            <button onClick={() => fetchUsers(0, search)} className="text-zinc-500 hover:text-white transition-colors"><RefreshCw className="w-4 h-4"/></button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[{l:'Total',v:total,c:'text-white'},{l:'Bannis',v:users.filter(u=>u.is_banned).length,c:'text-red-400'},{l:'Désactivés',v:users.filter(u=>u.is_disabled).length,c:'text-orange-400'}].map(s=>(
              <div key={s.l} className="bg-zinc-900 rounded-xl p-2.5 text-center border border-zinc-800">
                <p className={`text-lg font-black ${s.c}`}>{s.v}</p>
                <p className="text-zinc-600 text-xs">{s.l}</p>
              </div>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600"/>
            <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Rechercher..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-zinc-600 placeholder-zinc-600 transition-colors"/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(6)].map((_,i)=><div key={i} className="h-16 rounded-xl bg-zinc-800/50 animate-pulse"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-600"><Users className="w-8 h-8 mb-2"/><p className="text-sm">Aucun utilisateur</p></div>
          ) : (
            <div className="p-2 space-y-1">
              {filtered.map(user => {
                const role = roleConfig[user.role||'user']; const RoleIcon = role.icon
                const isSel = selected?.user.id === user.id
                return (
                  <button key={user.id} onClick={()=>openUser(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isSel?'bg-zinc-800 border border-zinc-700':'hover:bg-zinc-900 border border-transparent'}`}>
                    <div className="relative flex-shrink-0">
                      <Avatar user={user} size={38}/>
                      {user.is_banned && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-zinc-950 flex items-center justify-center"><X className="w-2 h-2 text-white"/></div>}
                      {user.is_disabled&&!user.is_banned&&<div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-zinc-950"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white truncate">{user.username}</span>
                        <RoleIcon className={`w-3 h-3 flex-shrink-0 ${role.color}`}/>
                      </div>
                      <p className="text-xs text-zinc-600 truncate">{user.last_seen?timeAgo(user.last_seen):`inscrit ${timeAgo(user.created_at)}`}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-700 flex-shrink-0"/>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {/* Pagination */}
        {total > 100 && (
          <div className="p-3 border-t border-zinc-800 flex items-center justify-between gap-2">
            <button
              onClick={() => fetchUsers(page - 1, search)}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold disabled:opacity-30 hover:bg-zinc-800 transition-colors"
            >← Préc.</button>
            <span className="text-zinc-500 text-xs">{page * 100 + 1}–{Math.min((page + 1) * 100, total)} / {total}</span>
            <button
              onClick={() => fetchUsers(page + 1, search)}
              disabled={(page + 1) * 100 >= total}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold disabled:opacity-30 hover:bg-zinc-800 transition-colors"
            >Suiv. →</button>
          </div>
        )}
      </div>

      {/* DETAIL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {loadingDetail ? (
          <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>
        ) : !selected ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-zinc-700"><Users className="w-16 h-16"/><p className="text-lg font-semibold">Sélectionne un utilisateur</p></div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-zinc-800 p-6">
              <div className="flex items-start gap-5">
                <div className="relative">
                  <Avatar user={u!} size={72}/>
                  {u!.is_banned&&<div className="absolute inset-0 rounded-full bg-red-950/80 flex items-center justify-center"><Ban className="w-6 h-6 text-red-400"/></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h2 className="text-2xl font-black text-white">{u!.username}</h2>
                    {(()=>{const role=roleConfig[u!.role||'user'];const RoleIcon=role.icon;return(
                      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${role.bg} ${role.color} ${role.border}`}>
                        <RoleIcon className="w-3 h-3"/>{role.label}
                      </span>
                    )})()}
                    {u!.is_banned&&<span className="px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-800 text-xs font-bold">BANNI</span>}
                    {u!.is_disabled&&!u!.is_banned&&<span className="px-3 py-1 rounded-full bg-orange-950 text-orange-400 border border-orange-800 text-xs font-bold">DÉSACTIVÉ</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500 flex-wrap">
                    {u!.email&&<span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/>{u!.email}</span>}
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/>Inscrit {timeAgo(u!.created_at)}</span>
                    {u!.last_seen&&<span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/>Vu {timeAgo(u!.last_seen)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <select value={u!.role||'user'} onChange={e=>{const v=e.target.value;setConfirm({title:'Changer le rôle',message:`Passer ${u!.username} en "${v}" ?`,action:()=>patch(u!.id,{role:v})})}}
                    className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-xl px-3 py-2 outline-none cursor-pointer">
                    <option value="user">Utilisateur</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  {u!.is_disabled
                    ? <button onClick={()=>setConfirm({title:'Réactiver',message:`Réactiver ${u!.username} ?`,action:()=>patch(u!.id,{is_disabled:false,disabled_reason:null})})}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-950 border border-green-800 text-green-400 text-xs font-bold hover:bg-green-900 transition-colors"><Eye className="w-3.5 h-3.5"/>Réactiver</button>
                    : <button onClick={()=>setDisableModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-950 border border-orange-800 text-orange-400 text-xs font-bold hover:bg-orange-900 transition-colors"><EyeOff className="w-3.5 h-3.5"/>Désactiver</button>
                  }
                  {u!.is_banned
                    ? <button onClick={()=>setConfirm({title:'Débannir',message:`Débannir ${u!.username} ?`,action:()=>patch(u!.id,{is_banned:false})})}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-950 border border-green-800 text-green-400 text-xs font-bold hover:bg-green-900 transition-colors"><Check className="w-3.5 h-3.5"/>Débannir</button>
                    : <button onClick={()=>setConfirm({title:'Bannir',message:`Bannir ${u!.username} ? Il ne pourra plus se connecter.`,action:()=>patch(u!.id,{is_banned:true})})}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950 border border-red-800 text-red-400 text-xs font-bold hover:bg-red-900 transition-colors"><Ban className="w-3.5 h-3.5"/>Bannir</button>
                  }
                  <button onClick={()=>setConfirm({title:'Supprimer',message:`Supprimer définitivement ${u!.username} ?`,action:()=>deleteUser(u!.id)})}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-red-950 hover:border-red-800 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5"/>Supprimer</button>
                </div>
              </div>

              {u!.last_ip&&(
                <div className="mt-4 flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                  <Wifi className="w-4 h-4 text-zinc-500 flex-shrink-0"/>
                  <div className="flex-1"><p className="text-xs text-zinc-500 mb-0.5">Dernière IP</p><p className="text-sm font-mono text-white">{u!.last_ip}</p></div>
                  {ipBanned[u!.last_ip]
                    ? <button onClick={()=>banIp(u!.last_ip!,true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-950 border border-green-800 text-green-400 text-xs font-bold hover:bg-green-900 transition-colors"><Wifi className="w-3 h-3"/>Débannir IP</button>
                    : <button onClick={()=>setConfirm({title:'Bannir cette IP',message:`Bannir ${u!.last_ip} ? Tous les comptes avec cette IP seront bloqués.`,action:()=>banIp(u!.last_ip!)})} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950 border border-red-800 text-red-400 text-xs font-bold hover:bg-red-900 transition-colors"><WifiOff className="w-3 h-3"/>Bannir IP</button>
                  }
                </div>
              )}
              {u!.is_disabled&&u!.disabled_reason&&(
                <div className="mt-3 p-3 bg-orange-950/30 border border-orange-800/50 rounded-xl">
                  <p className="text-xs text-orange-400 font-semibold mb-1">Raison de désactivation</p>
                  <p className="text-sm text-orange-200">{u!.disabled_reason}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 px-6">
              {([{id:'info',label:'Infos',icon:User},{id:'history',label:`Historique (${selected.history.length})`,icon:MonitorPlay},{id:'favorites',label:`Favoris (${selected.favorites.length})`,icon:Heart},{id:'requests',label:`Demandes (${selected.requests.length})`,icon:MessageSquare},{id:'profiles',label:`Profils (${userProfiles.length})`,icon:Users}] as const).map(tab=>{
                const Icon=tab.icon
                return <button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab===tab.id?'border-primary text-white':'border-transparent text-zinc-500 hover:text-zinc-300'}`}><Icon className="w-4 h-4"/>{tab.label}</button>
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {activeTab==='info'&&(
                  <motion.div key="info" initial={{opacity:0}} animate={{opacity:1}} className="grid grid-cols-2 gap-4">
                    {[{l:'Discord ID',v:u!.discord_id,m:true},{l:'Email',v:u!.email||'—'},{l:'Rôle',v:roleConfig[u!.role||'user'].label},{l:'Statut',v:u!.is_banned?'Banni':u!.is_disabled?'Désactivé':'Actif'},{l:'Inscrit le',v:new Date(u!.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})},{l:'Dernière activité',v:u!.last_seen?timeAgo(u!.last_seen):'—'},{l:'IP',v:u!.last_ip||'—',m:true},{l:'Favoris',v:`${selected.favorites.length} titre(s)`}].map(item=>(
                      <div key={item.l} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">{item.l}</p>
                        <p className={`text-sm text-white font-medium ${item.m?'font-mono':''}`}>{item.v}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
                {activeTab==='history'&&(
                  <motion.div key="history" initial={{opacity:0}} animate={{opacity:1}} className="space-y-2">
                    {selected.history.length===0
                      ? <div className="text-center py-12 text-zinc-600"><MonitorPlay className="w-10 h-10 mx-auto mb-3"/><p>Aucun visionnage</p></div>
                      : selected.history.map(item=>(
                        <div key={item.id} className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                          {/* Poster */}
                          {item.poster
                            ? <Image src={`https://image.tmdb.org/t/p/w92${item.poster}`} alt={item.title} width={40} height={56} className="rounded-lg object-cover flex-shrink-0"/>
                            : <div className="w-10 h-14 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">{item.content_type==='movie'?<Film className="w-4 h-4 text-zinc-600"/>:<Tv className="w-4 h-4 text-zinc-600"/>}</div>
                          }
                          {/* Infos */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{item.content_type==='series'&&item.season?`S${item.season}E${item.episode} · `:''}{timeAgo(item.watched_at)}</p>
                            {item.progress>0&&(
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-zinc-600">Progression</span>
                                  <span className="text-[10px] text-zinc-500 font-semibold">{item.progress}%</span>
                                </div>
                                <div className="w-full h-1 bg-zinc-800 rounded-full"><div className="h-full bg-primary rounded-full" style={{width:`${item.progress}%`}}/></div>
                              </div>
                            )}
                          </div>
                          {/* Profil */}
                          {item.profiles&&(
                            <div className="flex-shrink-0 flex flex-col items-center gap-1">
                              {item.profiles.avatar_url
                                ? <Image src={item.profiles.avatar_url} alt={item.profiles.name} width={28} height={28} className="rounded-full object-cover border border-zinc-700"/>
                                : <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">{item.profiles.name[0].toUpperCase()}</div>
                              }
                              <span className="text-[10px] text-zinc-500 max-w-[60px] truncate text-center">{item.profiles.name}</span>
                            </div>
                          )}
                        </div>
                      ))
                    }
                  </motion.div>
                )}
                {activeTab==='favorites'&&(
                  <motion.div key="favorites" initial={{opacity:0}} animate={{opacity:1}} className="grid grid-cols-2 gap-3">
                    {selected.favorites.length===0
                      ? <div className="col-span-2 text-center py-12 text-zinc-600"><Heart className="w-10 h-10 mx-auto mb-3"/><p>Aucun favori</p></div>
                      : selected.favorites.map((fav:any)=>(
                        <div key={fav.id} className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                          {fav.poster?<Image src={`https://image.tmdb.org/t/p/w92${fav.poster}`} alt={fav.title} width={32} height={44} className="rounded-lg object-cover flex-shrink-0"/>:<div className="w-8 h-11 bg-zinc-800 rounded-lg flex-shrink-0"/>}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{fav.title}</p>
                            <p className="text-xs text-zinc-500">{fav.content_type==='movie'?'🎬 Film':'📺 Série'}</p>
                          </div>
                        </div>
                      ))
                    }
                  </motion.div>
                )}
                {activeTab==='requests'&&(
                  <motion.div key="requests" initial={{opacity:0}} animate={{opacity:1}} className="space-y-2">
                    {selected.requests.length===0
                      ? <div className="text-center py-12 text-zinc-600"><MessageSquare className="w-10 h-10 mx-auto mb-3"/><p>Aucune demande</p></div>
                      : selected.requests.map((req:any)=>(
                        <div key={req.id} className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{req.title}</p>
                            <p className="text-xs text-zinc-500">{req.content_type==='movie'?'🎬 Film':'📺 Série'} · {timeAgo(req.created_at)}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${req.status==='approved'?'bg-green-950 text-green-400 border border-green-800':req.status==='rejected'?'bg-red-950 text-red-400 border border-red-800':'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                            {req.status==='approved'?'Approuvé':req.status==='rejected'?'Refusé':'En attente'}
                          </span>
                        </div>
                      ))
                    }
                  </motion.div>
                )}
                {activeTab==='profiles'&&(
                  <motion.div key="profiles" initial={{opacity:0}} animate={{opacity:1}} className="space-y-3">
                    {loadingProfiles
                      ? <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-zinc-600"/></div>
                      : userProfiles.length===0
                        ? <div className="text-center py-12 text-zinc-600"><Users className="w-10 h-10 mx-auto mb-3"/><p>Aucun profil créé</p></div>
                        : userProfiles.map((p:any)=>(
                          <div key={p.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                            <div className="flex items-center gap-3">
                              {p.avatar_url
                                ? <Image src={p.avatar_url} alt={p.name} width={44} height={44} className="rounded-full object-cover flex-shrink-0"/>
                                : <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-zinc-500"/></div>
                              }
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-bold text-white">{p.name}</p>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${p.role==='admin'?'bg-amber-950 text-amber-400 border-amber-800':p.role==='staff'?'bg-blue-950 text-blue-400 border-blue-800':'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                                    {p.role==='admin'?'Admin':p.role==='staff'?'Staff':'Utilisateur'}
                                  </span>
                                  {p.is_child&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-800 font-bold">Enfant</span>}
                                  {p.pin&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">PIN: {p.pin}</span>}
                                </div>
                                <p className="text-xs text-zinc-500 mt-0.5">Créé le {new Date(p.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</p>
                              </div>
                              {/* Changer le rôle du profil */}
                              <select
                                value={p.role}
                                onChange={async e=>{
                                  const role=e.target.value
                                  await fetch('/api/auth/admin/user-profiles',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id,role})})
                                  setUserProfiles(prev=>prev.map(pr=>pr.id===p.id?{...pr,role}:pr))
                                }}
                                className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                              >
                                <option value="user">Utilisateur</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          </div>
                        ))
                    }
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {confirm&&<ConfirmModal title={confirm.title} message={confirm.message} onConfirm={()=>{confirm.action();setConfirm(null)}} onCancel={()=>setConfirm(null)}/>}
      {disableModal&&selected&&<DisableModal onConfirm={reason=>{patch(selected.user.id,{is_disabled:true,disabled_reason:reason});setDisableModal(false)}} onCancel={()=>setDisableModal(false)}/>}
    </div>
  )
}