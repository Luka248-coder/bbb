'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Send, Bug, HelpCircle, Crown, MessageCircle, Check, Loader2 } from 'lucide-react'
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
    color: 'bg-red-900/60',
    iconColor: 'text-red-400',
  },
  {
    id: 'aide' as Category,
    label: 'Aide générale',
    sub: 'Question sur le site ou le contenu',
    icon: HelpCircle,
    color: 'bg-blue-900/40',
    iconColor: 'text-blue-400',
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

  // On mount: restore ticket from localStorage
  useEffect(() => {
    if (!user) return
    const saved = localStorage.getItem('support_ticket')
    if (!saved) return
    try {
      const t: Ticket = JSON.parse(saved)
      // Only restore if ticket is not closed
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
        // Refresh ticket status from server
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
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-[340px] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            style={{ background: 'rgb(18,18,22)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10"
              style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0808 100%)' }}>
              {screen !== 'home' && (
                <button onClick={() => screen === 'form' ? setScreen('home') : reset()}
                  className="text-white/50 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">✦</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">
                  {screen === 'form' && catInfo ? catInfo.label : screen === 'discussion' ? ticket?.subject : 'Support StreamSelf'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs font-medium">En ligne · Répond sous 24h</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-[300px] max-h-[480px] overflow-y-auto">
              <AnimatePresence mode="wait">

                {/* HOME */}
                {screen === 'home' && (
                  <motion.div key="home" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="p-4 space-y-3">
                    <div className="bg-zinc-800/60 rounded-2xl p-4">
                      <p className="text-white text-base font-medium">👋 Salut ! Comment on peut t'aider aujourd'hui ?</p>
                    </div>
                    {categories.map(cat => {
                      const Icon = cat.icon
                      return (
                        <button key={cat.id} onClick={() => handleCategorySelect(cat.id)}
                          className="w-full flex items-center gap-3 p-3.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-white/5 hover:border-white/10 rounded-2xl transition-all text-left group">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                            <Icon className={`w-5 h-5 ${cat.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">{cat.label}</p>
                            <p className="text-white/40 text-xs">{cat.sub}</p>
                          </div>
                          <span className="text-white/30 group-hover:text-white/60 transition-colors">›</span>
                        </button>
                      )
                    })}
                  </motion.div>
                )}

                {/* FORM */}
                {screen === 'form' && catInfo && (
                  <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="p-4 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${catInfo.color}`}>
                        <CatIcon className={`w-4 h-4 ${catInfo.iconColor}`} />
                      </div>
                      <p className="text-white font-semibold">{catInfo.label}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">SUJET</p>
                      <input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors"
                      />
                    </div>
                    <div>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">MESSAGE</p>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Décris ton problème ou ta demande..."
                        rows={5}
                        className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/30 transition-colors resize-none placeholder-white/20"
                      />
                    </div>
                    <button onClick={handleSend} disabled={sending || !message.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {sending ? 'Envoi...' : 'Envoyer le message'}
                    </button>
                  </motion.div>
                )}

                {/* SUCCESS */}
                {screen === 'success' && ticket && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-black text-xl mb-1">Ticket envoyé !</p>
                      <p className="text-white/40 text-sm">L'équipe te répondra dans les 24h.</p>
                    </div>
                    <button onClick={() => openDiscussion(ticket)}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
                      Voir la discussion →
                    </button>
                    <button onClick={reset} className="text-white/30 hover:text-white/60 text-xs transition-colors">
                      Retour à l'accueil
                    </button>
                  </motion.div>
                )}

                {/* DISCUSSION */}
                {screen === 'discussion' && ticket && (
                  <motion.div key="discussion" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col h-full">
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-72">
                      {loadingMessages ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                        </div>
                      ) : messages.map(msg => {
                        const isMe = !msg.is_admin
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                              isMe
                                ? 'bg-primary text-white rounded-br-md'
                                : 'bg-zinc-800 text-white rounded-bl-md'
                            }`}>
                              {msg.is_admin && (
                                <p className="text-xs text-white/50 font-bold mb-1">Support</p>
                              )}
                              <p className="leading-relaxed">{msg.message}</p>
                              <p className={`text-xs mt-1 ${isMe ? 'text-white/50' : 'text-white/30'}`}>
                                {timeAgo(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                    {ticket.status !== 'closed' ? (
                      <div className="border-t border-white/10 p-3 flex gap-2">
                        <input
                          value={reply}
                          onChange={e => setReply(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                          placeholder="Répondre..."
                          className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-white/30 transition-colors placeholder-white/20"
                        />
                        <button onClick={sendReply} disabled={sendingReply || !reply.trim()}
                          className="w-9 h-9 flex items-center justify-center bg-primary hover:bg-primary/90 disabled:opacity-40 rounded-xl transition-colors flex-shrink-0">
                          {sendingReply ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                        </button>
                      </div>
                    ) : (
                      <div className="border-t border-white/10 p-3 text-center text-xs text-white/30">
                        Ticket fermé
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (!open) {
            // Check localStorage for active ticket
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
              } catch {
                reset()
              }
            } else {
              reset()
            }
          }
          setOpen(!open)
        }}
        className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/40 flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}