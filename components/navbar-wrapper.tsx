'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/navbar'

const HIDDEN_PATHS = [
  '/login',
  '/auth',
  '/admin',
  '/watch',
]

export function NavbarWrapper() {
  const pathname = usePathname()

  const hide = HIDDEN_PATHS.some(path =>
    pathname.startsWith(path)
  )

  if (hide) return null

  return <Navbar />
}
