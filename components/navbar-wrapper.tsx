'use client'
import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/navbar'

const HIDDEN_PATHS = ['/login', '/auth']

export function NavbarWrapper() {
  const pathname = usePathname()
  const hide = HIDDEN_PATHS.some(p => pathname.startsWith(p))
  if (hide) return null
  return <Navbar />
}
