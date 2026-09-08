'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, Send, Bug, HelpCircle, MessageCircle, Check, Loader2 } from 'lucide-react'
import { useSession } from '@/components/session-provider'
import { usePathname } from 'next/navigation'

type Screen = 'home' | 'form' | 'discussion' | 'success'
type Category = 'bug' | 'aide'

interface Ticket {
  id: string
  category: Category
  subject: string
  status: string
  created_at: string
  updated_at?: string
}

interface Message {
  id: string
  message: string
  is_admin: boolean
  created_at: string
  users: { username: string; avatar: string | null; discord_id: string }
}

const categories = [
  { id: 'bug' as Category, label: 'Bug', sub: 'Un problème sur le site' },
  { id: 'aide' as Category, label: 'Aide', sub: 'Une question' },
]

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}j`
  if (hours > 0) return `${hours}h`
  if (mins > 0) return `${mins}min`
  return 'à l’instant'
}

export function SupportWidget() {
  const { user } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hidden = pathname?.startsWith('/admin') || pathname?.startsWith('/watch') || pathname?.startsWith('/login')

  const loadTickets = async () => {
    try {
      const res = await fetch('/api/support?mine=1')
      if (!res.ok) return
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : [])
    } catch {}
  }

  useEffect(() => {
    if (user) loadTickets()
  }, [user, open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const reset = () => {
    setScreen('home')
    setSelectedCategory(null)
    setSubject('')
    setMessage('')
    setTicket(null)
    setMessages([])
    setReply('')
  }

  const handleSend = async () => {
    if (!message.trim() || !selectedCategory) return
    setSending(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory, subject: subject || categories.find(c => c.id === selectedCategory)?.label, message }),
      })
      if (res.ok) {
        const data = await res.json()
        setTicket(data)
        setScreen('success')
        loadTickets()
      }
    } catch {}
    setSending(false)
  }

  const openDiscussion = async (t: Ticket) => {
    setTicket(t)
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
      }
    } catch {}
    setSendingReply(false)
  }

  if (!user || hidden) return null

  const openTickets = tickets.filter(t => t.status !== 'closed')

  return (
    <div className="fixed z-[80] right-4 md:right-6 bottom-24 md:bottom-6 font-[family-name:var(--font-montserrat)] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-2xl"
          >
            <div className="flex items-center gap-2 px-4 h-14 border-b border-white/10 bg-red-600">
              {screen !== 'home' && (
                <button
                  type="button"
                  onClick={() => setScreen('home')}
                  className="w-11 h-11 -ml-2 flex items-center justify-center text-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <p className="flex-1 text-white text-sm font-semibold truncate">
                {screen === 'form' ? (selectedCategory === 'bug' ? 'Bug' : 'Aide')
                  : screen === 'discussion' ? (ticket?.subject || 'Discussion')
                  : 'Support'}
              </p>
              <button type="button" onClick={() => setOpen(false)} className="w-11 h-11 -mr-2 flex items-center justify-center text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-[280px] max-h-[420px] overflow-y-auto">
              {screen === 'home' && (
                <div className="p-4 space-y-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setSubject(cat.label); setScreen('form') }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-left"
                    >
                      {cat.id === 'bug' ? <Bug className="w-4 h-4 text-red-400" /> : <HelpCircle className="w-4 h-4 text-red-400" />}
                      <div>
                        <p className="text-white text-sm font-medium">{cat.label}</p>
                        <p className="text-white/35 text-xs">{cat.sub}</p>
                      </div>
                    </button>
                  ))}

                  {openTickets.length > 0 && (
                    <div className="pt-3">
                      <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold mb-2">Tes tickets</p>
                      {openTickets.map(t => (
                        <button
                          key={t.id}
                          onClick={() => openDiscussion(t)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] text-left"
                        >
                          <span className="text-white/80 text-sm truncate">{t.subject}</span>
                          <span className="text-[10px] text-red-400 shrink-0">{t.status === 'answered' ? 'Réponse' : 'Ouvert'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {screen === 'form' && (
                <div className="p-4 space-y-3">
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Sujet"
                    className="w-full h-11 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none focus:border-red-500/50 placeholder-white/25"
                  />
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Décris le problème…"
                    rows={5}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none focus:border-red-500/50 placeholder-white/25 resize-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer
                  </button>
                </div>
              )}

              {screen === 'success' && ticket && (
                <div className="p-8 text-center">
                  <Check className="w-8 h-8 text-red-500 mx-auto mb-3" />
                  <p className="text-white font-semibold">Message envoyé</p>
                  <p className="text-white/40 text-sm mt-1 mb-5">On te répond ici.</p>
                  <button onClick={() => openDiscussion(ticket)} className="h-10 px-4 rounded-xl bg-white text-black text-sm font-semibold">
                    Ouvrir
                  </button>
                </div>
              )}

              {screen === 'discussion' && ticket && (
                <div className="flex flex-col min-h-[280px]">
                  <div className="flex-1 p-4 space-y-2.5 overflow-y-auto max-h-64">
                    {loadingMessages ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>
                    ) : messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] ${
                          msg.is_admin ? 'bg-white/[0.06] text-white/85 rounded-bl-md' : 'bg-red-600 text-white rounded-br-md'
                        }`}>
                          {msg.is_admin && <p className="text-[10px] text-red-400 font-semibold mb-0.5">Support</p>}
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          <p className="text-[10px] opacity-40 mt-1">{timeAgo(msg.created_at)}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  {ticket.status !== 'closed' ? (
                    <div className="p-3 border-t border-white/10 flex gap-2">
                      <input
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendReply()}
                        placeholder="Répondre…"
                        className="flex-1 h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none focus:border-red-500/50 placeholder-white/25"
                      />
                      <button
                        onClick={sendReply}
                        disabled={sendingReply || !reply.trim()}
                        className="w-10 h-10 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 flex items-center justify-center"
                      >
                        {sendingReply ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-white/30 text-xs py-3 border-t border-white/10">Ticket fermé</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 flex items-center justify-center"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && openTickets.some(t => t.status === 'answered') && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-white" />
        )}
      </button>
    </div>
  )
}
