'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Send, Bug, HelpCircle, MessageCircle, Check, Loader2, Sparkles, Zap } from 'lucide-react'
import { useSession } from '@/components/session-provider'

type Screen = 'home' | 'form' | 'discussion' | 'success'
type Category = 'bug' | 'aide' | 'vip'

interface Ticket {
  id: string
  category: Category
  subject: string
  status: string
  created_at: string
}

interface Message {
  id: string
  message: string
  is_admin: boolean
  created_at: string
  users: { username: string; avatar: string | null; discord_id: string }
}

const categories = [
  {
    id: 'bug' as Category,
    label: 'Bug / Problème',
    sub: 'Un truc qui marche pas ?',
    icon: Bug,
    gradient: 'from-blue-950/80 to-blue-900/40',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    accent: '#1d6fe8',
    glow: 'shadow-blue-900/30',
  },
  {
    id: 'aide' as Category,
    label: 'Aide générale',
    sub: 'Question sur le site ou le contenu',
    icon: HelpCircle,
    gradient: 'from-indigo-950/80 to-indigo-900/40',
    iconBg: 'bg-indigo-500/15',
    iconColor: 'text-indigo-400',
    accent: '#818cf8',
    glow: 'shadow-indigo-900/30',
  },
]

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}j`
  if (hours > 0) return `${hours}h`
  if (mins > 0) return `${mins}min`
  return 'maintenant'
}

export function SupportWidget() {
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    const saved = localStorage.getItem('support_ticket')
    if (!saved) return
    try {
      const t: Ticket = JSON.parse(saved)
      if (t.status !== 'closed') {
        setTicket(t)
        setScreen('discussion')
      } else {
        localStorage.removeItem('support_ticket')
      }
    } catch {
      localStorage.removeItem('support_ticket')
    }
  }, [user])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const reset = () => {
    setScreen('home')
    setSelectedCategory(null)
    setSubject('')
    setMessage('')
    setTicket(null)
    setMessages([])
    setReply('')
    localStorage.removeItem('support_ticket')
  }

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat)
    setSubject(categories.find(c => c.id === cat)?.label || '')
    setScreen('form')
  }

  const handleSend = async () => {
    if (!message.trim() || !selectedCategory) return
    setSending(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory, subject, message }),
      })
      if (res.ok) {
        const data = await res.json()
        setTicket(data)
        localStorage.setItem('support_ticket', JSON.stringify(data))
        setScreen('success')
      }
    } catch {}
    setSending(false)
  }

  const openDiscussion = async (t: Ticket) => {
    setTicket(t)
    localStorage.setItem('support_ticket', JSON.stringify(t))
    setScreen('discussion')
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/support/messages?ticket_id=${t.id}`)
      if (res.ok) setMessages(await res.json())
    } catch {}
    setLoadingMessages(false)
  }

  const sendReply = async () => {
    if (!reply.trim() || !ticket) return
    setSendingReply(true)
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticket.id, message: reply }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data])
        setReply('')
        const ticketRes = await fetch('/api/support')
        if (ticketRes.ok) {
          const tickets = await ticketRes.json()
          const updated = tickets.find((t: Ticket) => t.id === ticket.id)
          if (updated) {
            setTicket(updated)
            if (updated.status === 'closed') {
              localStorage.removeItem('support_ticket')
            } else {
              localStorage.setItem('support_ticket', JSON.stringify(updated))
            }
          }
        }
      }
    } catch {}
    setSendingReply(false)
  }

  if (!user) return null

  const catInfo = selectedCategory ? categories.find(c => c.id === selectedCategory) : null
  const CatIcon = catInfo?.icon || HelpCircle

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="w-[360px] rounded-[22px] overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(160deg, #0f0a0b 0%, #0a0709 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Header */}
            <div className="relative px-5 py-4 flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(29,111,232,0.18) 0%, rgba(21,88,192,0.08) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
              {/* Subtle blue glow line at top */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(29,111,232,0.6), transparent)' }} />

              {screen !== 'home' && (
                <motion.button
                  whileHover={{ x: -2 }}
                  onClick={() => screen === 'form' ? setScreen('home') : reset()}
                  className="text-white/35 hover:text-white/80 transition-colors mr-1">
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
              )}

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #1d6fe8 0%, #1558c0 100%)',
                    boxShadow: '0 0 12px rgba(200,40,40,0.4)',
                  }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0f0a0b]" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[13px] tracking-tight">
                  {screen === 'form' && catInfo ? catInfo.label
                    : screen === 'discussion' ? (ticket?.subject || 'Discussion')
                    : 'Support StreamSelf'}
                </p>
                <p className="text-emerald-400/80 text-[11px] font-medium tracking-wide">
                  En ligne · Répond sous 24h
                </p>
              </div>

              <motion.button
                whileHover={{ rotate: 90, scale: 1.1 }}
                transition={{ duration: 0.2 }}
                onClick={() => setOpen(false)}
                className="text-white/25 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Body */}
            <div className="min-h-[290px] max-h-[460px] overflow-y-auto
              [&::-webkit-scrollbar]:w-1
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-white/10
              [&::-webkit-scrollbar-thumb]:rounded-full">
              <AnimatePresence mode="wait">

                {/* HOME */}
                {screen === 'home' && (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-2.5">

                    {/* Greeting bubble */}
                    <div className="flex items-start gap-2.5 mb-4">
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                        style={{ background: 'linear-gradient(135deg, #1d6fe8 0%, #1558c0 100%)' }}>
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-tl-sm max-w-[85%]"
                        style={{
                          background: 'rgba(255,255,255,0.055)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                        <p className="text-white/90 text-[13.5px] leading-relaxed font-medium">
                          👋 Salut ! Comment on peut t'aider aujourd'hui ?
                        </p>
                      </div>
                    </div>

                    {categories.map((cat, i) => {
                      const Icon = cat.icon
                      return (
                        <motion.button
                          key={cat.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                          whileHover={{ x: 3 }}
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl transition-all text-left group`}
                          style={{
                            background: 'rgba(255,255,255,0.035)',
                            border: '1px solid rgba(255,255,255,0.07)',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.065)'
                            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.035)'
                            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'
                          }}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.iconBg}`}
                            style={{ border: `1px solid ${cat.accent}22` }}>
                            <Icon className={`w-[18px] h-[18px] ${cat.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/90 font-semibold text-[13px]">{cat.label}</p>
                            <p className="text-white/35 text-[11.5px] mt-0.5">{cat.sub}</p>
                          </div>
                          <motion.span
                            className="text-white/20 group-hover:text-white/50 text-base transition-colors"
                            animate={{ x: [0, 2, 0] }}
                            transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}>
                            ›
                          </motion.span>
                        </motion.button>
                      )
                    })}
                  </motion.div>
                )}

                {/* FORM */}
                {screen === 'form' && catInfo && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-3.5">

                    {/* Category badge */}
                    <div className="flex items-center gap-2.5 pb-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${catInfo.iconBg}`}>
                        <CatIcon className={`w-4 h-4 ${catInfo.iconColor}`} />
                      </div>
                      <p className="text-white/70 font-medium text-[13px]">{catInfo.label}</p>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="text-white/30 text-[10.5px] font-bold uppercase tracking-[0.1em] mb-1.5 block">
                        Sujet
                      </label>
                      <input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="w-full text-white/90 text-[13px] px-3.5 py-2.5 rounded-xl outline-none transition-all placeholder-white/20"
                        style={{
                          background: 'rgba(255,255,255,0.045)',
                          border: '1px solid rgba(255,255,255,0.09)',
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = 'rgba(200,50,50,0.5)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.045)'
                        }}
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className="text-white/30 text-[10.5px] font-bold uppercase tracking-[0.1em] mb-1.5 block">
                        Message
                      </label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Décris ton problème ou ta demande..."
                        rows={5}
                        className="w-full text-white/90 text-[13px] px-3.5 py-2.5 rounded-xl outline-none transition-all placeholder-white/20 resize-none"
                        style={{
                          background: 'rgba(255,255,255,0.045)',
                          border: '1px solid rgba(255,255,255,0.09)',
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = 'rgba(200,50,50,0.5)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.045)'
                        }}
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSend}
                      disabled={sending || !message.trim()}
                      className="w-full flex items-center justify-center gap-2 text-white font-semibold text-[13px] py-3 rounded-xl transition-all disabled:opacity-40"
                      style={{
                        background: 'linear-gradient(135deg, #1d6fe8 0%, #1558c0 100%)',
                        boxShadow: '0 4px 16px rgba(200,40,40,0.3)',
                      }}>
                      {sending
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi en cours...</>
                        : <><Send className="w-3.5 h-3.5" /> Envoyer le message</>
                      }
                    </motion.button>
                  </motion.div>
                )}

                {/* SUCCESS */}
                {screen === 'success' && ticket && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 text-center space-y-5">

                    {/* Animated checkmark */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                      className="w-16 h-16 rounded-full mx-auto flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full opacity-20 animate-ping"
                        style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                          background: 'rgba(34,197,94,0.12)',
                          border: '1.5px solid rgba(34,197,94,0.4)',
                        }}>
                        <Check className="w-7 h-7 text-emerald-400" />
                      </div>
                    </motion.div>

                    <div>
                      <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white font-bold text-lg tracking-tight mb-1">
                        Ticket envoyé !
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-white/35 text-[12.5px]">
                        L'équipe te répondra dans les 24h.
                      </motion.p>
                    </div>

                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openDiscussion(ticket)}
                      className="w-full py-2.5 rounded-xl text-white/80 hover:text-white text-[13px] font-medium transition-colors"
                      style={{
                        background: 'rgba(255,255,255,0.055)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                      Voir la discussion →
                    </motion.button>

                    <button onClick={reset} className="text-white/25 hover:text-white/50 text-[11.5px] transition-colors">
                      Retour à l'accueil
                    </button>
                  </motion.div>
                )}

                {/* DISCUSSION */}
                {screen === 'discussion' && ticket && (
                  <motion.div
                    key="discussion"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col">

                    {/* Ticket status bar */}
                    <div className="px-4 py-2.5 flex items-center justify-between"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-white/30 text-[11px] font-medium uppercase tracking-wider">
                        Ticket #{ticket.id.slice(0, 8)}
                      </span>
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                        ticket.status === 'closed'
                          ? 'text-white/40 bg-white/5'
                          : 'text-emerald-400 bg-emerald-400/10'
                      }`}>
                        {ticket.status === 'closed' ? 'Fermé' : 'Ouvert'}
                      </span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-64
                      [&::-webkit-scrollbar]:w-1
                      [&::-webkit-scrollbar-thumb]:bg-white/10
                      [&::-webkit-scrollbar-thumb]:rounded-full">
                      {loadingMessages ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-white/20 text-[12px]">Aucun message pour l'instant</p>
                        </div>
                      ) : messages.map((msg, i) => {
                        const isMe = !msg.is_admin
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                            {!isMe && (
                              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mb-0.5"
                                style={{ background: 'linear-gradient(135deg, #1d6fe8, #1558c0)' }}>
                                <Zap className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                              isMe ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'
                            }`}
                              style={isMe
                                ? { background: 'linear-gradient(135deg, #1d6fe8, #1456b8)', color: 'rgba(255,255,255,0.92)' }
                                : { background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }
                              }>
                              {msg.is_admin && (
                                <p className="text-[10px] text-white/40 font-bold mb-1 uppercase tracking-wider">Support</p>
                              )}
                              <p>{msg.message}</p>
                              <p className="text-[10px] mt-1.5 opacity-40">{timeAgo(msg.created_at)}</p>
                            </div>
                          </motion.div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Reply input */}
                    {ticket.status !== 'closed' ? (
                      <div className="p-3 flex gap-2 items-center"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <input
                          value={reply}
                          onChange={e => setReply(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                          placeholder="Répondre..."
                          className="flex-1 text-white/90 text-[13px] px-3.5 py-2 rounded-xl outline-none transition-all placeholder-white/20"
                          style={{
                            background: 'rgba(255,255,255,0.045)',
                            border: '1px solid rgba(255,255,255,0.09)',
                          }}
                          onFocus={e => e.currentTarget.style.borderColor = 'rgba(200,50,50,0.4)'}
                          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'}
                        />
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={sendReply}
                          disabled={sendingReply || !reply.trim()}
                          className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-30 transition-opacity"
                          style={{
                            background: 'linear-gradient(135deg, #1d6fe8, #1558c0)',
                            boxShadow: '0 2px 8px rgba(29,111,232,0.35)',
                          }}>
                          {sendingReply
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            : <Send className="w-3.5 h-3.5 text-white" />
                          }
                        </motion.button>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-center"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-white/25 text-[11.5px]">Ce ticket est fermé</p>
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => {
          if (!open) {
            const saved = localStorage.getItem('support_ticket')
            if (saved) {
              try {
                const t: Ticket = JSON.parse(saved)
                if (t.status !== 'closed') {
                  setTicket(t)
                  setScreen('discussion')
                  if (messages.length === 0) {
                    setLoadingMessages(true)
                    fetch(`/api/support/messages?ticket_id=${t.id}`)
                      .then(r => r.json())
                      .then(data => { if (Array.isArray(data)) setMessages(data) })
                      .catch(() => {})
                      .finally(() => setLoadingMessages(false))
                  }
                } else {
                  localStorage.removeItem('support_ticket')
                  reset()
                }
              } catch { reset() }
            } else {
              reset()
            }
          }
          setOpen(!open)
        }}
        className="relative w-[52px] h-[52px] rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #1d6fe8 0%, #1558c0 100%)',
          boxShadow: '0 4px 20px rgba(29,111,232,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* Pulse ring */}
        {!open && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
            style={{ background: 'radial-gradient(circle, rgba(29,111,232,0.5), transparent)' }}
          />
        )}

        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18 }}>
              <X className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18 }}>
              <MessageCircle className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
