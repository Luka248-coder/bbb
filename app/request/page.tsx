export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { RequestForm } from '@/components/request-form'

export const metadata = {
  title: 'Demander un contenu - Streamself',
  description: 'Demandez l\'ajout d\'un film ou d\'une série sur Streamself',
}

export default async function RequestPage() {
  const user = await getSession()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 pt-24">
        <RequestForm userId={user.id} />
      </main>
      
      <Footer />
    </div>
  )
}