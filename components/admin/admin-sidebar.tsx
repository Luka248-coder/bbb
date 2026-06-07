'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Database, Film, Tv, Users, MessageSquare,
  Settings, Home, LogOut, Bell, Headphones as HeadphonesIcon, Zap, Sparkles, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/auth'

interface AdminSidebarProps {
  user: User
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/movies', label: 'Films', icon: Film },
  { href: '/admin/series', label: 'Séries', icon: Tv },
  { href: '/admin/recommendations', label: 'Recommandations', icon: Sparkles },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/requests', label: 'Demandes', icon: MessageSquare },
  { href: '/admin/support', label: 'Support', icon: HeadphonesIcon },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/api', label: 'API', icon: Zap },
  { href: '/admin/api-catalogue', label: 'API Catalogue', icon: Database },
  { href: '/admin/hero', label: 'Hero / Mise en avant', icon: Film },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
]

function NavContent({ user, pathname, onClose }: { user: User; pathname: string; onClose?: () => void }) {
  const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png` : null

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT_Image_27_avr._2026_a%CC%80_00_48_07-removebg-preview-q9gJZZAURjXxiGLwtVf8BsKdJaOxq9.png"
            alt="StreamSelf" width={120} height={30} className="h-8 w-auto"
          />
        </Link>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground px-6 pt-3 pb-1">Administration</p>

      {/* Nav */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link href={item.href} onClick={onClose}>
                  <div className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Link href="/" onClick={onClose}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
            <Home className="w-5 h-5" />
            <span className="font-medium">Retour au site</span>
          </div>
        </Link>

        <div className="flex items-center gap-3 px-4 py-3">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={user.username} width={36} height={36} className="rounded-full flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">
              {user.username[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user.username}</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>

        <button
          onClick={async () => { await fetch('/api/auth/logout'); window.location.href = '/' }}
          className="w-full"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Déconnexion</span>
          </div>
        </button>
      </div>
    </div>
  )
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col min-h-screen">
        <NavContent user={user} pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-14 bg-card border-b border-border">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT_Image_27_avr._2026_a%CC%80_00_48_07-removebg-preview-q9gJZZAURjXxiGLwtVf8BsKdJaOxq9.png"
          alt="StreamSelf" width={100} height={28} className="h-6 w-auto"
        />
        <span className="text-xs text-muted-foreground ml-1">Admin</span>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-50 bg-card border-r border-border"
            >
              <NavContent user={user} pathname={pathname} onClose={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
