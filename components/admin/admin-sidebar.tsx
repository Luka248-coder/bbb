'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Library, Users, Headphones, Bell,
  Home, LogOut, Menu, X, ChevronRight, Film, Tv, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/auth'

interface AdminSidebarProps { user: User }

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Catalogue',
    icon: Library,
    children: [
      { href: '/admin/movies', label: 'Films', icon: Film },
      { href: '/admin/series', label: 'Séries', icon: Tv },
      { href: '/admin/api-catalogue', label: 'API', icon: Zap },
    ],
  },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/support', label: 'Support', icon: Headphones },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
]

function NavContent({ user, pathname, onClose }: { user: User; pathname: string; onClose?: () => void }) {
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`
    : null

  const [catalogueOpen, setCatalogueOpen] = useState(
    pathname.startsWith('/admin/movies') ||
    pathname.startsWith('/admin/series') ||
    pathname.startsWith('/admin/api-catalogue')
  )

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between border-b border-white/[0.06]">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
          <Image src="/images/logo.png" alt="Logo" width={28} height={28} className="h-7 w-auto" />
          <span className="text-[10px] font-semibold tracking-widest text-white/20 uppercase">Admin</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <p className="text-[10px] font-semibold tracking-widest text-white/20 uppercase px-3 mb-3">Navigation</p>

        {navItems.map((item) => {
          if (item.children) {
            const isGroupActive = item.children.some(c => isActive(c.href))
            return (
              <div key={item.label}>
                <button
                  onClick={() => setCatalogueOpen(o => !o)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isGroupActive
                      ? 'text-white bg-white/[0.08]'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight className={cn('w-3.5 h-3.5 transition-transform text-white/20', catalogueOpen && 'rotate-90')} />
                </button>
                <AnimatePresence initial={false}>
                  {catalogueOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-3 pl-3 border-l border-white/[0.06] mt-0.5 space-y-0.5 py-1">
                        {item.children.map(child => {
                          const active = isActive(child.href)
                          return (
                            <Link key={child.href} href={child.href} onClick={onClose}>
                              <div className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                                active
                                  ? 'text-white bg-primary/20 border border-primary/20'
                                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                              )}>
                                <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-medium">{child.label}</span>
                                {active && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          const active = isActive(item.href!, item.exact)
          return (
            <Link key={item.href} href={item.href!} onClick={onClose}>
              <div className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'text-white bg-primary/15 border border-primary/20'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
              )}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06] space-y-1 flex-shrink-0">
        <Link href="/" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all">
            <Home className="w-4 h-4" />
            <span className="font-medium">Retour au site</span>
          </div>
        </Link>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={user.username} width={32} height={32} className="rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                {user.username[0].toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user.username}</p>
            <p className="text-white/30 text-[10px]">Administrateur</p>
          </div>
          <button
            onClick={async () => { await fetch('/api/auth/logout'); window.location.href = '/' }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Déconnexion"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
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
      <aside className="hidden md:flex w-56 bg-zinc-950 border-r border-white/[0.06] flex-col h-screen sticky top-0 flex-shrink-0">
        <NavContent user={user} pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-14 bg-zinc-950 border-b border-white/[0.06]">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Image
          src="/images/logo.png"
          alt="Logo" width={24} height={24} className="h-5 w-auto"
        />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 36 }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-64 z-50 bg-zinc-950 border-r border-white/[0.06]"
            >
              <NavContent user={user} pathname={pathname} onClose={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
