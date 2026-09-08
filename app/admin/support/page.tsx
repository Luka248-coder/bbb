'use client'

import { useState, useEffect, useRef } from 'react'
import { Bug, HelpCircle, Crown, MessageSquareMore, Send, Loader2, Check, X, Clock } from 'lucide-react'

interface Ticket {
  id: string
  category: 'bug' | 'aide' | 'vip'
  subject: string
  status: 'open' | 'answered' | 'closed'
  created_at: string
  updated_at: string
  ip?: string | null
  users: { username: string; avatar: string | null; discord_id: string } | null
}

interface Message {
  id: string
  message: string
  is_admin: boolean
  created_at: string
  users: { username: string; avatar: string | null; discord_id: string }
}

const catConfig = {
  bug: { label: 'Bug', icon: Bug },
  aide: { label: 'Aide', icon: HelpCircle },
  vip: { label: 'VIP', icon: Crown },
}

const statusConfig = {
  open: { label: 'Ouvert', icon: Clock },
  answered: { label: 'Répondu', icon: Check },
  closed: { label: 'Fermé', icon: X },
}

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

  useEffect(() => { fetchTickets() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen bg-[#08080a] text-white">
      <div className="w-full max-w-sm border-r border-white/10 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-xl font-bold">Support</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {openCount > 0 ? `${openCount} en attente` : 'Aucun ticket en attente'}
          </p>
          <div className="flex gap-1 mt-4 p-1 rounded-xl bg-white/[0.04]">
            {(['all', 'open', 'answered', 'closed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold ${
                  filter === f ? 'bg-red-600 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : f === 'answered' ? 'Répondus' : 'Fermés'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
          ) : filteredTickets.length === 0 ? (
            <p className="text-center text-white/30 text-sm py-12">Aucun ticket</p>
          ) : filteredTickets.map(ticket => {
            const CatIcon = catConfig[ticket.category]?.icon || HelpCircle
            const selected = selectedTicket?.id === ticket.id
            return (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className={`w-full text-left px-4 py-3.5 border-b border-white/5 ${selected ? 'bg-red-600/15' : 'hover:bg-white/[0.03]'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/15 flex items-center justify-center shrink-0">
                    <CatIcon className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{ticket.subject}</p>
                      <span className="text-[11px] text-white/30 shrink-0">{timeAgo(ticket.updated_at)}</span>
                    </div>
                    <p className="text-xs text-white/35 mt-0.5">
                      {ticket.users?.username ? `@${ticket.users.username}` : ticket.ip || 'Invité'}
                    </p>
                    <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      ticket.status === 'open' ? 'bg-red-600/20 text-red-400'
                        : ticket.status === 'answered' ? 'bg-white/10 text-white/60'
                        : 'bg-white/5 text-white/30'
                    }`}>
                      {statusConfig[ticket.status].label}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!selectedTicket ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquareMore className="w-12 h-12 mx-auto text-white/15 mb-3" />
              <p className="text-white/40 font-medium">Sélectionne un ticket</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">{selectedTicket.subject}</p>
                <p className="text-sm text-white/40">
                  {selectedTicket.users?.username ? `@${selectedTicket.users.username}` : selectedTicket.ip || 'Invité'}
                </p>
              </div>
              <div className="flex gap-1">
                {(['open', 'answered', 'closed'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => changeStatus(selectedTicket.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${
                      selectedTicket.status === s ? 'bg-red-600 text-white' : 'text-white/40 hover:bg-white/5'
                    }`}
                  >
                    {statusConfig[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
              ) : messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.is_admin ? 'bg-red-600 text-white rounded-br-md' : 'bg-white/[0.06] text-white/90 rounded-bl-md'
                  }`}>
                    <p className="text-[10px] font-bold opacity-60 mb-1">{msg.is_admin ? 'Support' : `@${msg.users?.username}`}</p>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-[10px] opacity-40 mt-1">{timeAgo(msg.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {selectedTicket.status !== 'closed' ? (
              <div className="p-4 border-t border-white/10 flex gap-2">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                  placeholder="Répondre…"
                  rows={2}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm outline-none focus:border-red-500/50 resize-none placeholder-white/25"
                />
                <button
                  onClick={sendReply}
                  disabled={sendingReply || !reply.trim()}
                  className="w-11 h-11 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 flex items-center justify-center self-end"
                >
                  {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="p-4 border-t border-white/10 text-center text-sm text-white/35">
                Ticket fermé — <button onClick={() => changeStatus(selectedTicket.id, 'open')} className="text-red-400 hover:underline">Rouvrir</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
