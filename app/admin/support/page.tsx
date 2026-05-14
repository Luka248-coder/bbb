'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bug, HelpCircle, Crown, MessageSquareMore, Send, Loader2, Check, X, Clock, ChevronRight } from 'lucide-react'

interface Ticket {
  id: string
  category: 'bug' | 'aide' | 'vip'
  subject: string
  status: 'open' | 'answered' | 'closed'
  created_at: string
  updated_at: string
  users: { username: string; avatar: string | null; discord_id: string }
}

interface Message {
  id: string
  message: string
  is_admin: boolean
  created_at: string
  users: { username: string; avatar: string | null; discord_id: string }
}

const catConfig = {
  bug: { label: 'Bug', icon: Bug, color: 'bg-red-500/20 text-red-400', border: 'border-red-500/30' },
  aide: { label: 'Aide', icon: HelpCircle, color: 'bg-blue-500/20 text-blue-400', border: 'border-blue-500/30' },
  vip: { label: 'VIP', icon: Crown, color: 'bg-yellow-500/20 text-yellow-400', border: 'border-yellow-500/30' },
}

const statusConfig = {
  open: { label: 'Ouvert', color: 'bg-orange-500/20 text-orange-400', icon: Clock },
  answered: { label: 'Répondu', color: 'bg-green-500/20 text-green-400', icon: Check },
  closed: { label: 'Fermé', color: 'bg-zinc-500/20 text-zinc-400', icon: X },
}

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

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'answered' | 'closed'>('all')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/support')
      if (res.ok) setTickets(await res.json())
    } catch {}
    setLoading(false)
  }

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setLoadingMessages(true)
    setMessages([])
    try {
      const res = await fetch(`/api/support/messages?ticket_id=${ticket.id}`)
      if (res.ok) setMessages(await res.json())
    } catch {}
    setLoadingMessages(false)
  }

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return
    setSendingReply(true)
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: selectedTicket.id, message: reply }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data])
        setReply('')
        setTickets(prev => prev.map(t =>
          t.id === selectedTicket.id ? { ...t, status: 'answered', updated_at: new Date().toISOString() } : t
        ))
        setSelectedTicket(prev => prev ? { ...prev, status: 'answered' } : prev)
      }
    } catch {}
    setSendingReply(false)
  }

  const changeStatus = async (ticketId: string, status: 'open' | 'answered' | 'closed') => {
    try {
      await fetch('/api/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status }),
      })
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t))
      setSelectedTicket(prev => prev?.id === ticketId ? { ...prev, status } : prev)
    } catch {}
  }

  const filteredTickets = tickets.filter(t => filter === 'all' || t.status === filter)
  const openCount = tickets.filter(t => t.status === 'open').length

  return (
    <div className="flex h-screen">
      {/* Left panel - ticket list */}
      <div className="w-96 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MessageSquareMore className="w-6 h-6 text-primary" />
                Support
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {openCount > 0 ? `${openCount} ticket${openCount > 1 ? 's' : ''} en attente` : 'Aucun ticket en attente'}
              </p>
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
            {(['all', 'open', 'answered', 'closed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === f ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : f === 'answered' ? 'Répondus' : 'Fermés'}
              </button>
            ))}
          </div>
        </div>

        {/* Ticket list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 px-6">
              <MessageSquareMore className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Aucun ticket</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTickets.map(ticket => {
                const cat = catConfig[ticket.category]
                const status = statusConfig[ticket.status]
                const CatIcon = cat.icon
                const isSelected = selectedTicket?.id === ticket.id
                return (
                  <button key={ticket.id} onClick={() => openTicket(ticket)}
                    className={`w-full text-left p-4 hover:bg-secondary/30 transition-colors ${isSelected ? 'bg-secondary/50 border-l-2 border-primary' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color.split(' ')[0]}`}>
                        <CatIcon className={`w-4 h-4 ${cat.color.split(' ')[1]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{timeAgo(ticket.updated_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">@{ticket.users?.username}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel - discussion */}
      <div className="flex-1 flex flex-col">
        {!selectedTicket ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <MessageSquareMore className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg font-medium">Sélectionne un ticket</p>
              <p className="text-muted-foreground/50 text-sm mt-1">pour voir la discussion</p>
            </div>
          </div>
        ) : (
          <>
            {/* Ticket header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const cat = catConfig[selectedTicket.category]
                  const CatIcon = cat.icon
                  return (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color.split(' ')[0]}`}>
                      <CatIcon className={`w-5 h-5 ${cat.color.split(' ')[1]}`} />
                    </div>
                  )
                })()}
                <div>
                  <p className="font-bold text-foreground">{selectedTicket.subject}</p>
                  <p className="text-sm text-muted-foreground">@{selectedTicket.users?.username} · {timeAgo(selectedTicket.created_at)}</p>
                </div>
              </div>
              {/* Status controls */}
              <div className="flex items-center gap-2">
                {(['open', 'answered', 'closed'] as const).map(s => {
                  const st = statusConfig[s]
                  const StatusIcon = st.icon
                  return (
                    <button key={s} onClick={() => changeStatus(selectedTicket.id, s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        selectedTicket.status === s
                          ? `${st.color} border-current`
                          : 'text-muted-foreground border-transparent hover:bg-secondary'
                      }`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {st.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.map(msg => {
                const isAdmin = msg.is_admin
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-5 py-3 rounded-2xl ${
                      isAdmin
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-secondary text-foreground rounded-bl-md'
                    }`}>
                      <p className={`text-xs font-bold mb-1 ${isAdmin ? 'text-white/60' : 'text-muted-foreground'}`}>
                        {isAdmin ? '⚡ Support' : `@${msg.users?.username}`}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1.5 ${isAdmin ? 'text-white/50' : 'text-muted-foreground'}`}>
                        {timeAgo(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            {selectedTicket.status !== 'closed' ? (
              <div className="p-4 border-t border-border">
                <div className="flex gap-3">
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                    placeholder="Répondre au ticket... (Entrée pour envoyer)"
                    rows={3}
                    className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-primary/50 transition-colors resize-none placeholder-muted-foreground"
                  />
                  <button onClick={sendReply} disabled={sendingReply || !reply.trim()}
                    className="flex items-center justify-center w-12 bg-primary hover:bg-primary/90 disabled:opacity-40 rounded-xl transition-colors self-end mb-px flex-shrink-0 h-10">
                    {sendingReply ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-border text-center text-sm text-muted-foreground">
                Ticket fermé — <button onClick={() => changeStatus(selectedTicket.id, 'open')}
                  className="text-primary hover:underline">Rouvrir</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}