'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/session-provider'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || (!user.is_admin && user.role !== 'staff'))) {
      router.replace('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || (!user.is_admin && user.role !== 'staff')) return null

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar user={user} />
      {/* pt-14 sur mobile pour laisser place à la topbar fixe */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
