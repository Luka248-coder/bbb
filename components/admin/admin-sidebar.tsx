'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Film, Tv, Users, MessageSquare,
  Settings, Home, LogOut, Bell, Headphones as HeadphonesIcon, Zap, Sparkles,
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
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
]

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png` : null

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT_Image_27_avr._2026_a%CC%80_00_48_07-removebg-preview-q9gJZZAURjXxiGLwtVf8BsKdJaOxq9.png"
            alt="Cinemafrance" width={120} height={30} className="h-8 w-auto"
          />
        </Link>
        <p className="text-xs text-muted-foreground mt-2">Administration</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <motion.div whileHover={{ x: 4 }}
                    className={cn('flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}>
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </motion.div>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Link href="/">
          <motion.div whileHover={{ x: 4 }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Home className="w-5 h-5" />
            <span className="font-medium">Retour au site</span>
          </motion.div>
        </Link>

        <div className="flex items-center gap-3 px-4 py-3">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={user.username} width={36} height={36} className="rounded-full" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
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
          <motion.div whileHover={{ x: 4 }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Déconnexion</span>
          </motion.div>
        </button>
      </div>
    </aside>
  )
}
